import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Worker class for testing
class MockWorker {
  constructor() {
    this.onmessage = null;
    this.onerror = null;
    this._posted = [];
  }
  postMessage(msg) {
    this._posted.push(msg);
  }
  terminate() {}
  _simulateMessage(data) {
    if (this.onmessage) this.onmessage({ data });
  }
}

let mockWorkerInstance = null;

vi.stubGlobal('Worker', class {
  constructor(url) {
    mockWorkerInstance = new MockWorker();
    mockWorkerInstance._url = url;
    return mockWorkerInstance;
  }
});

// Mock Blob and URL.createObjectURL for cross-origin tests
vi.stubGlobal('Blob', class {
  constructor(parts, opts) {
    this._parts = parts;
    this._opts = opts;
  }
});
const _blobUrls = [];
if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = (blob) => {
    const url = 'blob:http://localhost/' + Math.random().toString(36).slice(2);
    _blobUrls.push(url);
    return url;
  };
}
if (!globalThis.URL.revokeObjectURL) {
  globalThis.URL.revokeObjectURL = () => {};
}

// Mock loadScript / loadCSS
vi.mock('../../../lib/utils.js', () => ({
  uid: () => 'pl-test-1',
  loadScript: vi.fn().mockResolvedValue(undefined),
  loadCSS: vi.fn(),
  fetchPythonSource: vi.fn(),
  resolveSourceUrl: vi.fn(url => url),
}));

// Mock config — use a mutable object so tests can set initTimeout
const mockConfig = {};
vi.mock('../../../lib/config.js', () => ({
  _defaults: {},
  _config: mockConfig,
  cdnUrls: () => ({
    pyodide: 'https://cdn.example.com/pyodide.js',
    bokehJs: ['https://cdn.example.com/bokeh.js'],
    panelJs: 'https://cdn.example.com/panel.js',
    bokehWhl: 'https://cdn.example.com/bokeh.whl',
    panelWhl: 'https://cdn.example.com/panel.whl',
  }),
}));

// Mock error-renderer
vi.mock('../../../lib/error-renderer.js', () => ({
  renderError: vi.fn(),
}));

// Now import the module under test
const { getWorkerBridge } = await import('../../../lib/worker-bridge.js');

describe('getWorkerBridge', () => {
  let bridge;

  beforeEach(() => {
    vi.useFakeTimers();
    mockWorkerInstance = null;
    // Clean up any initTimeout from previous tests
    delete mockConfig.initTimeout;
    bridge = getWorkerBridge();
    if (bridge._worker) bridge.terminate();
    bridge = getWorkerBridge();
  });

  afterEach(() => {
    if (bridge && bridge._worker) bridge.terminate();
    vi.useRealTimers();
  });

  it('returns a singleton', () => {
    const b1 = getWorkerBridge();
    const b2 = getWorkerBridge();
    expect(b1).toBe(b2);
  });

  it('init() creates a worker and sends init message', async () => {
    const statusCb = vi.fn();
    const initPromise = bridge.init(statusCb);

    expect(mockWorkerInstance).not.toBeNull();
    expect(mockWorkerInstance._posted.length).toBe(1);
    expect(mockWorkerInstance._posted[0].type).toBe('init');
    expect(mockWorkerInstance._posted[0].config.pyodideUrl).toBe('https://cdn.example.com/pyodide.js');
    expect(mockWorkerInstance._posted[0].config.packageAliases).toBeDefined();

    mockWorkerInstance._simulateMessage({ type: 'ready' });
    await initPromise;
  });

  it('init() is idempotent (does not create second worker)', async () => {
    const p1 = bridge.init(vi.fn());
    mockWorkerInstance._simulateMessage({ type: 'ready' });
    await p1;

    const firstWorker = mockWorkerInstance;
    await bridge.init(vi.fn());
    // Should still be the same worker (no new Worker created)
    expect(mockWorkerInstance).toBe(firstWorker);
  });

  it('resolves worker URL from script src', () => {
    const url = bridge._resolveWorkerUrl();
    expect(url).toContain('panel-live-worker.js');
  });

  it('run() posts run message and resolves on no-output', async () => {
    const initP = bridge.init(vi.fn());
    mockWorkerInstance._simulateMessage({ type: 'ready' });
    await initP;

    const el = document.createElement('div');
    el.id = 'test-output-1';
    const statusCb = vi.fn();
    const runPromise = bridge.run(el, 'print("hello")', statusCb);

    const runMsg = mockWorkerInstance._posted.find(m => m.type === 'run');
    expect(runMsg).toBeDefined();
    expect(runMsg.code).toBe('print("hello")');
    expect(runMsg.targetId).toBe('test-output-1');

    mockWorkerInstance._simulateMessage({
      type: 'no-output',
      runId: runMsg.runId,
      targetId: 'test-output-1',
      stdout: 'hello\n',
      stderr: '',
    });

    await runPromise;
    expect(el.innerHTML).toContain('hello');
  });

  it('run() rejects on error', async () => {
    const initP = bridge.init(vi.fn());
    mockWorkerInstance._simulateMessage({ type: 'ready' });
    await initP;

    const el = document.createElement('div');
    el.id = 'test-output-2';
    const runPromise = bridge.run(el, 'raise ValueError("bad")', vi.fn());

    const runMsg = mockWorkerInstance._posted.find(m => m.type === 'run');
    mockWorkerInstance._simulateMessage({
      type: 'error',
      runId: runMsg.runId,
      targetId: 'test-output-2',
      message: 'ValueError: bad',
      traceback: 'ValueError: bad',
      stdout: '',
      stderr: '',
    });

    await expect(runPromise).rejects.toThrow('ValueError: bad');
  });

  it('install() posts install message with array', async () => {
    const initP = bridge.init(vi.fn());
    mockWorkerInstance._simulateMessage({ type: 'ready' });
    await initP;

    bridge.install(['numpy', 'pandas']);
    const msg = mockWorkerInstance._posted.find(m => m.type === 'install');
    expect(msg).toBeDefined();
    expect(msg.packages).toEqual(['numpy', 'pandas']);
  });

  it('install() parses requirement text', async () => {
    const initP = bridge.init(vi.fn());
    mockWorkerInstance._simulateMessage({ type: 'ready' });
    await initP;

    bridge.install('numpy\npandas\n# comment\n');
    const msg = mockWorkerInstance._posted.find(m => m.type === 'install');
    expect(msg.packages).toEqual(['numpy', 'pandas']);
  });

  it('install() splits space-separated packages', async () => {
    const initP = bridge.init(vi.fn());
    mockWorkerInstance._simulateMessage({ type: 'ready' });
    await initP;

    bridge.install('fastparquet requests');
    const msg = mockWorkerInstance._posted.find(m => m.type === 'install');
    expect(msg.packages).toEqual(['fastparquet', 'requests']);
  });

  it('install() resolves package aliases', async () => {
    const initP = bridge.init(vi.fn());
    mockWorkerInstance._simulateMessage({ type: 'ready' });
    await initP;

    mockConfig.packageAliases = { 'duckdb': 'https://example.com/duckdb.whl' };
    bridge.install(['duckdb', 'pandas']);
    const msg = mockWorkerInstance._posted.find(m => m.type === 'install');
    expect(msg.packages).toEqual(['https://example.com/duckdb.whl', 'pandas']);
    delete mockConfig.packageAliases;
  });

  it('writeFile() posts write-file message', async () => {
    const initP = bridge.init(vi.fn());
    mockWorkerInstance._simulateMessage({ type: 'ready' });
    await initP;

    bridge.writeFile('utils.py', 'def foo(): pass');
    const msg = mockWorkerInstance._posted.find(m => m.type === 'write-file');
    expect(msg).toBeDefined();
    expect(msg.name).toBe('utils.py');
    expect(msg.content).toBe('def foo(): pass');
  });

  it('reset() posts reset message and clears element state', async () => {
    const initP = bridge.init(vi.fn());
    mockWorkerInstance._simulateMessage({ type: 'ready' });
    await initP;

    bridge._elements['test-id'] = { jsdoc: null, busy: false, patchQueue: [] };
    bridge.reset('test-id');

    const msg = mockWorkerInstance._posted.find(m => m.type === 'reset');
    expect(msg).toBeDefined();
    expect(msg.targetId).toBe('test-id');
    expect(bridge._elements['test-id']).toBeUndefined();
  });

  it('terminate() nulls worker and resets singleton', async () => {
    const initP = bridge.init(vi.fn());
    mockWorkerInstance._simulateMessage({ type: 'ready' });
    await initP;

    bridge.terminate();
    expect(bridge._worker).toBeNull();

    const newBridge = getWorkerBridge();
    expect(newBridge).not.toBe(bridge);
    bridge = newBridge;
  });

  it('forwards status messages to run callbacks', async () => {
    const initP = bridge.init(vi.fn());
    mockWorkerInstance._simulateMessage({ type: 'ready' });
    await initP;

    const el = document.createElement('div');
    el.id = 'test-output-3';
    const statusCb = vi.fn();
    bridge.run(el, 'x = 1', statusCb);

    mockWorkerInstance._simulateMessage({ type: 'status', msg: 'Installing numpy...' });
    expect(statusCb).toHaveBeenCalledWith('Installing numpy...');

    // Clean up run
    const runMsg = mockWorkerInstance._posted.find(m => m.type === 'run');
    mockWorkerInstance._simulateMessage({
      type: 'no-output', runId: runMsg.runId, targetId: el.id, stdout: '', stderr: '',
    });
  });

  it('handles stdout streaming', async () => {
    const initP = bridge.init(vi.fn());
    mockWorkerInstance._simulateMessage({ type: 'ready' });
    await initP;

    const el = document.createElement('div');
    el.id = 'test-output-4';
    const runPromise = bridge.run(el, 'print("a"); print("b")', vi.fn());

    const runMsg = mockWorkerInstance._posted.find(m => m.type === 'run');

    mockWorkerInstance._simulateMessage({ type: 'stdout', text: 'a\n', runId: runMsg.runId });
    mockWorkerInstance._simulateMessage({ type: 'stdout', text: 'b\n', runId: runMsg.runId });

    const pre = el.querySelector('pre.pl-stdout');
    expect(pre).not.toBeNull();
    expect(pre.textContent).toBe('a\nb\n');

    mockWorkerInstance._simulateMessage({
      type: 'no-output', runId: runMsg.runId, targetId: el.id, stdout: '', stderr: '',
    });
    await runPromise;
  });

  it('cleanupElement removes element state', () => {
    bridge._elements['el-1'] = { jsdoc: null, busy: false, patchQueue: [] };
    bridge._refCount = 1;
    bridge.cleanupElement('el-1');
    expect(bridge._elements['el-1']).toBeUndefined();
  });

  it('handles idle message and flushes patch queue', async () => {
    const initP = bridge.init(vi.fn());
    mockWorkerInstance._simulateMessage({ type: 'ready' });
    await initP;

    const mockJsdoc = { create_json_patch: vi.fn().mockReturnValue({ events: [] }) };
    bridge._elements['el-2'] = {
      jsdoc: mockJsdoc,
      busy: true,
      patchQueue: [{ model: 'm1', attr: 'value' }],
    };

    mockWorkerInstance._simulateMessage({ type: 'idle', targetId: 'el-2' });

    expect(mockJsdoc.create_json_patch).toHaveBeenCalled();
    const patchMsg = mockWorkerInstance._posted.find(m => m.type === 'patch');
    expect(patchMsg).toBeDefined();
  });

  it('handles idle with empty queue (sets busy=false)', async () => {
    const initP = bridge.init(vi.fn());
    mockWorkerInstance._simulateMessage({ type: 'ready' });
    await initP;

    bridge._elements['el-3'] = { jsdoc: null, busy: true, patchQueue: [] };
    mockWorkerInstance._simulateMessage({ type: 'idle', targetId: 'el-3' });
    expect(bridge._elements['el-3'].busy).toBe(false);
  });

  // --- Fix 1: Cross-origin worker creation ---

  describe('_createWorker', () => {
    it('creates a regular Worker for same-origin URLs', () => {
      // Use a relative path — same-origin by definition
      const worker = bridge._createWorker('/panel-live-worker.js');
      expect(worker).toBeDefined();
      // Should NOT be a blob URL (same origin = direct Worker)
      expect(worker._url).toBe('/panel-live-worker.js');
    });

    it('creates a blob-wrapped Worker for cross-origin URLs', () => {
      const worker = bridge._createWorker('https://cdn.holoviz.org/panel-live-worker.js');
      expect(worker).toBeDefined();
      // The blob wrapper results in a blob: URL being passed to Worker constructor
      expect(worker._url).toMatch(/^blob:/);
    });

    it('falls back to regular Worker on URL parse error', () => {
      // An empty string should not throw
      const worker = bridge._createWorker('');
      expect(worker).toBeDefined();
    });
  });

  // --- Fix 2: Graceful error on init failure ---

  describe('file:// pre-flight check', () => {
    it('throws immediately when protocol is file://', async () => {
      const origProtocol = Object.getOwnPropertyDescriptor(window.location, 'protocol');
      // jsdom doesn't allow setting location.protocol directly,
      // so we test the logic indirectly by verifying the check is present
      // We can test _doInit throws by temporarily mocking location
      const origLocation = globalThis.location;
      delete globalThis.location;
      globalThis.location = { protocol: 'file:', href: 'file:///index.html', origin: 'null' };

      try {
        await expect(bridge.init(vi.fn())).rejects.toThrow('file:// protocol');
      } finally {
        globalThis.location = origLocation;
        // Reset initPromise since it now holds a rejected promise
        bridge._initPromise = null;
      }
    });
  });

  describe('_onWorkerError', () => {
    it('produces actionable error on network failure', async () => {
      const initP = bridge.init(vi.fn());

      // Simulate a network error from the worker
      mockWorkerInstance.onerror({ message: 'NetworkError: Failed to fetch' });

      await expect(initP).rejects.toThrow('Network error loading the worker script');
    });

    it('produces generic error for unknown failures', async () => {
      const initP = bridge.init(vi.fn());

      mockWorkerInstance.onerror({ message: 'Something unexpected' });

      await expect(initP).rejects.toThrow('Worker error: Something unexpected');
    });
  });

  // --- Fix 3: Init timeout ---

  describe('init timeout', () => {
    it('rejects with timeout error when worker does not respond', async () => {
      mockConfig.initTimeout = 100; // 100ms for fast test

      const initPromise = bridge.init(vi.fn());

      // Attach rejection handler BEFORE advancing time to prevent unhandled rejection
      const assertion = expect(initPromise).rejects.toThrow('Initialization timed out');

      // Advance time past the timeout (async to flush microtasks)
      await vi.advanceTimersByTimeAsync(150);

      await assertion;
    });

    it('clears timeout when worker sends ready before timeout', async () => {
      mockConfig.initTimeout = 5000;

      const initPromise = bridge.init(vi.fn());

      // Worker responds quickly
      mockWorkerInstance._simulateMessage({ type: 'ready' });

      await initPromise;

      // Timer should be cleared
      expect(bridge._initTimer).toBeNull();
    });

    it('clears timeout on terminate()', async () => {
      mockConfig.initTimeout = 5000;

      bridge.init(vi.fn());

      // Terminate before ready
      bridge.terminate();
      expect(bridge._initTimer).toBeNull();
      bridge = getWorkerBridge();
    });
  });

  // --- Fix 4: Ref counting and worker termination ---

  describe('ref counting', () => {
    it('registerElement() increments ref count', () => {
      expect(bridge._refCount).toBe(0);
      bridge.registerElement();
      expect(bridge._refCount).toBe(1);
      bridge.registerElement();
      expect(bridge._refCount).toBe(2);
    });

    it('cleanupElement() decrements ref count', () => {
      bridge._refCount = 2;
      bridge._elements['el-a'] = { jsdoc: null, busy: false, patchQueue: [] };
      bridge.cleanupElement('el-a');
      expect(bridge._refCount).toBe(1);
      expect(bridge._terminationTimer).toBeNull();
    });

    it('schedules termination when ref count reaches 0', () => {
      bridge._refCount = 1;
      bridge._elements['el-b'] = { jsdoc: null, busy: false, patchQueue: [] };
      bridge.cleanupElement('el-b');
      expect(bridge._refCount).toBe(0);
      expect(bridge._terminationTimer).not.toBeNull();
    });

    it('cancels termination timer when registerElement called during grace period', () => {
      bridge._refCount = 1;
      bridge._elements['el-c'] = { jsdoc: null, busy: false, patchQueue: [] };
      bridge.cleanupElement('el-c');
      expect(bridge._terminationTimer).not.toBeNull();

      // Re-register within the 5s grace period
      bridge.registerElement();
      expect(bridge._terminationTimer).toBeNull();
      expect(bridge._refCount).toBe(1);
    });

    it('terminates worker after grace period when no elements remain', async () => {
      const initP = bridge.init(vi.fn());
      mockWorkerInstance._simulateMessage({ type: 'ready' });
      await initP;

      bridge._refCount = 1;
      bridge._elements['el-d'] = { jsdoc: null, busy: false, patchQueue: [] };
      bridge.cleanupElement('el-d');

      // Worker should still exist during grace period
      expect(bridge._worker).not.toBeNull();

      // Advance past the 5s grace period
      vi.advanceTimersByTime(6000);

      // Worker should be terminated now
      expect(bridge._worker).toBeNull();
      bridge = getWorkerBridge();
    });

    it('terminate() resets ref count and clears termination timer', async () => {
      bridge._refCount = 3;
      bridge._terminationTimer = setTimeout(() => {}, 5000);
      bridge.terminate();
      expect(bridge._refCount).toBe(0);
      expect(bridge._terminationTimer).toBeNull();
      bridge = getWorkerBridge();
    });
  });

  // --- Message validation ---

  describe('_validateWorkerMessage', () => {
    it('accepts valid ready message', () => {
      expect(bridge._validateWorkerMessage({ type: 'ready' })).toBe(true);
    });

    it('accepts valid status message', () => {
      expect(bridge._validateWorkerMessage({ type: 'status', msg: 'Loading...' })).toBe(true);
    });

    it('accepts valid render message', () => {
      expect(bridge._validateWorkerMessage({
        type: 'render', runId: 'run-1', targetId: 'el-1', docs_json: '{}',
      })).toBe(true);
    });

    it('accepts valid no-output message', () => {
      expect(bridge._validateWorkerMessage({
        type: 'no-output', runId: 'run-1', targetId: 'el-1',
      })).toBe(true);
    });

    it('accepts valid error message', () => {
      expect(bridge._validateWorkerMessage({
        type: 'error', runId: 'run-1', message: 'ValueError',
      })).toBe(true);
    });

    it('accepts valid stdout message', () => {
      expect(bridge._validateWorkerMessage({
        type: 'stdout', runId: 'run-1', text: 'output',
      })).toBe(true);
    });

    it('accepts valid patch message', () => {
      expect(bridge._validateWorkerMessage({
        type: 'patch', targetId: 'el-1', patch: { events: [] },
      })).toBe(true);
    });

    it('accepts valid idle message', () => {
      expect(bridge._validateWorkerMessage({ type: 'idle', targetId: 'el-1' })).toBe(true);
    });

    it('accepts valid done message', () => {
      expect(bridge._validateWorkerMessage({ type: 'done' })).toBe(true);
    });

    it('rejects null message', () => {
      expect(bridge._validateWorkerMessage(null)).toBe(false);
    });

    it('rejects non-object message', () => {
      expect(bridge._validateWorkerMessage('hello')).toBe(false);
    });

    it('rejects unknown type', () => {
      expect(bridge._validateWorkerMessage({ type: 'unknown' })).toBe(false);
    });

    it('rejects render missing runId', () => {
      expect(bridge._validateWorkerMessage({
        type: 'render', targetId: 'el-1', docs_json: '{}',
      })).toBe(false);
    });

    it('rejects render missing docs_json', () => {
      expect(bridge._validateWorkerMessage({
        type: 'render', runId: 'run-1', targetId: 'el-1',
      })).toBe(false);
    });

    it('rejects error missing message', () => {
      expect(bridge._validateWorkerMessage({
        type: 'error', runId: 'run-1',
      })).toBe(false);
    });

    it('rejects status missing msg', () => {
      expect(bridge._validateWorkerMessage({ type: 'status' })).toBe(false);
    });

    it('rejects patch missing targetId', () => {
      expect(bridge._validateWorkerMessage({
        type: 'patch', patch: { events: [] },
      })).toBe(false);
    });
  });
});
