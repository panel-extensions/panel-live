import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetchPythonSource
vi.mock('../../../lib/utils.js', () => ({
  fetchPythonSource: vi.fn().mockResolvedValue('# fetched code'),
  uid: () => 'pl-test-1',
  loadScript: vi.fn(),
  loadCSS: vi.fn(),
  resolveSourceUrl: vi.fn(url => url),
}));

// Import after mocks are set up
const { fetchPythonSource } = await import('../../../lib/utils.js');

// Register custom elements (they auto-register on import)
await import('../../../lib/helper-elements.js');

describe('PanelFile (<panel-file>)', () => {
  let el;

  beforeEach(() => {
    el = document.createElement('panel-file');
  });

  it('has default name "app.py"', () => {
    expect(el.name).toBe('app.py');
  });

  it('reads name attribute', () => {
    el.setAttribute('name', 'utils.py');
    expect(el.name).toBe('utils.py');
  });

  it('entrypoint is false by default', () => {
    expect(el.entrypoint).toBe(false);
  });

  it('entrypoint is true when attribute present', () => {
    el.setAttribute('entrypoint', '');
    expect(el.entrypoint).toBe(true);
  });

  it('src is null by default', () => {
    expect(el.src).toBeNull();
  });

  it('reads src attribute', () => {
    el.setAttribute('src', 'https://example.com/code.py');
    expect(el.src).toBe('https://example.com/code.py');
  });

  it('code returns textContent', () => {
    el.textContent = 'print("hello")';
    expect(el.code).toBe('print("hello")');
  });

  it('resolveCode() returns textContent when no src', async () => {
    el.textContent = 'x = 1';
    const code = await el.resolveCode();
    expect(code).toBe('x = 1');
  });

  it('resolveCode() fetches from src when set', async () => {
    el.setAttribute('src', 'https://example.com/code.py');
    const code = await el.resolveCode();
    expect(fetchPythonSource).toHaveBeenCalledWith('https://example.com/code.py');
    expect(code).toBe('# fetched code');
  });
});

describe('PanelRequirements (<panel-requirements>)', () => {
  it('packages returns textContent', () => {
    const el = document.createElement('panel-requirements');
    el.textContent = 'numpy\npandas';
    expect(el.packages).toBe('numpy\npandas');
  });
});

describe('PanelExample (<panel-example>)', () => {
  let el;

  beforeEach(() => {
    el = document.createElement('panel-example');
  });

  it('label defaults to "Example"', () => {
    expect(el.label).toBe('Example');
  });

  it('label reads name attribute', () => {
    el.setAttribute('name', 'My Example');
    expect(el.label).toBe('My Example');
  });

  it('src is null by default', () => {
    expect(el.src).toBeNull();
  });

  it('code returns textContent', () => {
    el.textContent = 'import panel as pn';
    expect(el.code).toBe('import panel as pn');
  });

  it('resolveCode() returns trimmed textContent when no src', async () => {
    el.textContent = '  import panel as pn  ';
    const code = await el.resolveCode();
    expect(code).toBe('import panel as pn');
  });

  it('resolveCode() fetches from src when set', async () => {
    fetchPythonSource.mockClear();
    el.setAttribute('src', 'https://example.com/example.py');
    const code = await el.resolveCode();
    expect(fetchPythonSource).toHaveBeenCalledWith('https://example.com/example.py');
    expect(code).toBe('# fetched code');
  });
});
