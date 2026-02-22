import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock all eight imports of panel-live-element.js before importing it.
vi.mock('../../../lib/registry.js', () => ({
  registerElement: vi.fn(),
  unregisterElement: vi.fn(),
  getRegisteredElements: vi.fn(() => []),
  getRegisteredCount: vi.fn(() => 0),
}));
vi.mock('../../../lib/theme.js', () => ({
  resolveTheme: vi.fn(() => 'light'),
  onThemeChange: vi.fn(() => () => {}),
}));
vi.mock('../../../lib/utils.js', () => ({
  uid: vi.fn(() => 'pl-test-uid'),
  fetchPythonSource: vi.fn(),
  loadScript: vi.fn().mockResolvedValue(undefined),
  loadCSS: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../lib/config.js', () => ({
  _config: {},
  _autoRunOverride: null,
  cdnUrls: vi.fn(() => ({ bokehJs: [], panelJs: '' })),
}));
vi.mock('../../../lib/url-sharing.js', () => ({
  encodeCode: vi.fn(() => ''),
  getCodeFromHash: vi.fn(() => null),
  setCodeInHash: vi.fn(),
}));
vi.mock('../../../lib/codemirror.js', () => ({
  createEditor: vi.fn(() => null),
  setEditorTheme: vi.fn(),
  getEditorCode: vi.fn(() => ''),
  setEditorCode: vi.fn(),
}));
vi.mock('../../../lib/error-renderer.js', () => ({ renderError: vi.fn() }));
vi.mock('../../../lib/worker-bridge.js', () => ({
  getWorkerBridge: vi.fn(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    registerElement: vi.fn(),
    run: vi.fn().mockResolvedValue(undefined),
    install: vi.fn(),
    reset: vi.fn(),
    cleanupElement: vi.fn(),
    writeFile: vi.fn(),
    eval: vi.fn(),
    sendServerData: vi.fn(),
  })),
}));

// Import the module — registers the <panel-live> custom element as a side effect.
await import('../../../lib/panel-live-element.js');

// ---------------------------------------------------------------------------
// Group 1: Main document connection (MUST run first — module state is unpatched)
// ---------------------------------------------------------------------------
describe('Shadow DOM getElementById patching — main document (no shadow root)', () => {
  it('does NOT patch getElementById when element connects to main document', () => {
    // Set up a shadow root with an element inside — used to verify no patching occurs
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const target = document.createElement('div');
    target.id = 'no-patch-test';
    shadow.appendChild(target);

    // Before connecting panel-live: getElementById cannot see into shadow roots
    expect(document.getElementById('no-patch-test')).toBeNull();

    // Connect panel-live to MAIN document (not shadow root)
    const pl = document.createElement('panel-live');
    document.body.appendChild(pl);

    // After connecting to main document: getElementById is still unpatched
    expect(document.getElementById('no-patch-test')).toBeNull();

    // Clean up
    pl.remove();
    host.remove();
  });
});

// ---------------------------------------------------------------------------
// Group 2: First shadow root connection
// ---------------------------------------------------------------------------
describe('Shadow DOM getElementById patching — first shadow root', () => {
  let host1;
  let shadow1;
  let pl1;

  afterEach(() => {
    if (pl1 && pl1.parentNode) pl1.remove();
    if (host1 && host1.parentNode) host1.remove();
  });

  it('patches document.getElementById when element connects to shadow root', () => {
    host1 = document.createElement('div');
    document.body.appendChild(host1);
    shadow1 = host1.attachShadow({ mode: 'open' });

    const target = document.createElement('div');
    target.id = 'shadow-target-1';
    shadow1.appendChild(target);

    // Before connecting: getElementById cannot see into the shadow root
    expect(document.getElementById('shadow-target-1')).toBeNull();

    // Connect panel-live inside the shadow root — triggers _patchGetElementByIdForPL
    pl1 = document.createElement('panel-live');
    shadow1.appendChild(pl1);

    // After connecting: the patched getElementById finds the element in the shadow root
    expect(document.getElementById('shadow-target-1')).toBe(target);
  });

  it('original document.getElementById still finds main-document elements after patching', () => {
    const mainEl = document.createElement('div');
    mainEl.id = 'main-doc-el';
    document.body.appendChild(mainEl);

    expect(document.getElementById('main-doc-el')).toBe(mainEl);

    mainEl.remove();
  });
});

// ---------------------------------------------------------------------------
// Group 3: Second shadow root (idempotency)
// ---------------------------------------------------------------------------
describe('Shadow DOM getElementById patching — second shadow root', () => {
  let host1;
  let shadow1;
  let pl1;
  let host2;
  let shadow2;
  let pl2;

  afterEach(() => {
    if (pl2 && pl2.parentNode) pl2.remove();
    if (host2 && host2.parentNode) host2.remove();
    if (pl1 && pl1.parentNode) pl1.remove();
    if (host1 && host1.parentNode) host1.remove();
  });

  it('second panel-live connecting adds new root to set without re-wrapping getElementById', () => {
    // Set up first shadow root
    host1 = document.createElement('div');
    document.body.appendChild(host1);
    shadow1 = host1.attachShadow({ mode: 'open' });
    const target1 = document.createElement('div');
    target1.id = 'shadow-target-a';
    shadow1.appendChild(target1);
    pl1 = document.createElement('panel-live');
    shadow1.appendChild(pl1);

    // Set up second shadow root
    host2 = document.createElement('div');
    document.body.appendChild(host2);
    shadow2 = host2.attachShadow({ mode: 'open' });
    const target2 = document.createElement('div');
    target2.id = 'shadow-target-b';
    shadow2.appendChild(target2);
    pl2 = document.createElement('panel-live');
    shadow2.appendChild(pl2);

    // Both shadow root elements are findable via the patched getElementById
    expect(document.getElementById('shadow-target-b')).toBe(target2);
    expect(document.getElementById('shadow-target-a')).toBe(target1);
  });
});

// ---------------------------------------------------------------------------
// Group 4: CSS injection into shadow roots
// ---------------------------------------------------------------------------
describe('Shadow DOM CSS injection', () => {
  it('injects CSS clone from matching head link when panel-live.css link exists in head', () => {
    // Add a panel-live.css link to document.head
    const headLink = document.createElement('link');
    headLink.rel = 'stylesheet';
    headLink.href = 'https://example.com/panel-live.css';
    document.head.appendChild(headLink);

    // Create a new shadow root and connect panel-live inside it
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const pl = document.createElement('panel-live');
    shadow.appendChild(pl);

    // Verify the shadow root contains a cloned <link> for panel-live.css
    const links = shadow.querySelectorAll('link[rel="stylesheet"]');
    const cssLinks = Array.from(links).filter(l => /panel-live(?:\.min)?\.css/.test(l.href));
    expect(cssLinks.length).toBeGreaterThanOrEqual(1);

    // Clean up
    pl.remove();
    host.remove();
    headLink.remove();
  });

  it('injects CSS from script src fallback when no head link but panel-live.js script exists', () => {
    // Ensure no panel-live.css link in head
    for (const link of document.head.querySelectorAll('link[rel="stylesheet"]')) {
      if (/panel-live(?:\.min)?\.css/.test(link.href)) link.remove();
    }

    // Add a panel-live.js script to document
    const script = document.createElement('script');
    script.src = 'https://example.com/dist/panel-live.js';
    document.body.appendChild(script);

    // Create a new shadow root and connect panel-live inside it
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const pl = document.createElement('panel-live');
    shadow.appendChild(pl);

    // Verify the shadow root contains a <link> with the derived CSS URL
    const links = shadow.querySelectorAll('link[rel="stylesheet"]');
    const cssLinks = Array.from(links).filter(l => l.href.includes('panel-live.css'));
    expect(cssLinks.length).toBeGreaterThanOrEqual(1);
    expect(cssLinks[0].href).toBe('https://example.com/dist/panel-live.css');

    // Clean up
    pl.remove();
    host.remove();
    script.remove();
  });

  it('does not crash and adds no link when neither panel-live CSS link nor script exists', () => {
    // Ensure no panel-live.css link in head
    for (const link of document.head.querySelectorAll('link[rel="stylesheet"]')) {
      if (/panel-live(?:\.min)?\.css/.test(link.href)) link.remove();
    }
    // Ensure no panel-live.js script in document
    for (const s of document.querySelectorAll('script[src*="panel-live"]')) {
      if (/panel-live(?:\.min)?\.js/.test(s.src)) s.remove();
    }

    // Create a new shadow root and connect panel-live inside it
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const pl = document.createElement('panel-live');

    // Should not throw
    expect(() => shadow.appendChild(pl)).not.toThrow();

    // Verify shadow root has NO <link> elements
    const links = shadow.querySelectorAll('link[rel="stylesheet"]');
    expect(links.length).toBe(0);

    // Clean up
    pl.remove();
    host.remove();
  });
});
