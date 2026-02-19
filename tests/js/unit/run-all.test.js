import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerElement, unregisterElement, getRegisteredElements } from '../../../lib/registry.js';

// Mock config.js
vi.mock('../../../lib/config.js', () => {
  const config = {
    pyodideVersion: 'v0.28.2',
    panelVersion: '1.8.7',
    bokehVersion: '3.8.2',
    styleNonce: '',
    playgroundUrl: '',
  };
  return {
    _config: config,
    _defaults: { ...config },
    _autoRunOverride: null,
    setAutoRunOverride: vi.fn(),
    cdnUrls: () => ({}),
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

// Import api.js to get runAll (it must NOT re-define 'panel-live' custom element)
await import('../../../lib/api.js');

describe('PanelLive.runAll()', () => {
  let el1, el2, el3;

  beforeEach(() => {
    // Clean registry
    for (const el of getRegisteredElements()) {
      unregisterElement(el);
    }

    // Create mock elements in DOM order
    el1 = document.createElement('div');
    el1.id = 'el1';
    el1.run = vi.fn().mockResolvedValue(undefined);
    el1.status = 'idle';

    el2 = document.createElement('div');
    el2.id = 'el2';
    el2.run = vi.fn().mockResolvedValue(undefined);
    el2.status = 'idle';

    el3 = document.createElement('div');
    el3.id = 'el3';
    el3.run = vi.fn().mockResolvedValue(undefined);
    el3.status = 'idle';

    document.body.appendChild(el1);
    document.body.appendChild(el2);
    document.body.appendChild(el3);

    registerElement(el1);
    registerElement(el2);
    registerElement(el3);
  });

  afterEach(() => {
    el1.remove();
    el2.remove();
    el3.remove();
    for (const el of getRegisteredElements()) {
      unregisterElement(el);
    }
  });

  it('runs all elements in document order', async () => {
    const order = [];
    el1.run = vi.fn(async () => { order.push('el1'); });
    el2.run = vi.fn(async () => { order.push('el2'); });
    el3.run = vi.fn(async () => { order.push('el3'); });

    await window.PanelLive.runAll();

    expect(order).toEqual(['el1', 'el2', 'el3']);
  });

  it('re-runs elements that already have status "ready"', async () => {
    el2.status = 'ready';

    const result = await window.PanelLive.runAll();

    expect(el1.run).toHaveBeenCalled();
    expect(el2.run).toHaveBeenCalled();
    expect(el3.run).toHaveBeenCalled();
    expect(result.total).toBe(3);
  });

  it('continues on error', async () => {
    el1.run = vi.fn().mockRejectedValue(new Error('boom'));

    const result = await window.PanelLive.runAll();

    expect(el1.run).toHaveBeenCalled();
    expect(el2.run).toHaveBeenCalled();
    expect(el3.run).toHaveBeenCalled();
    expect(result.errors).toBe(1);
  });

  it('returns correct totals', async () => {
    el3.run = vi.fn().mockRejectedValue(new Error('fail'));

    const result = await window.PanelLive.runAll();

    expect(result.total).toBe(3);
    expect(result.errors).toBe(1);
  });

  it('dispatches pl-run-all-start and pl-run-all-end events', async () => {
    const startHandler = vi.fn();
    const endHandler = vi.fn();
    document.addEventListener('pl-run-all-start', startHandler);
    document.addEventListener('pl-run-all-end', endHandler);

    await window.PanelLive.runAll();

    expect(startHandler).toHaveBeenCalledTimes(1);
    expect(startHandler.mock.calls[0][0].detail.count).toBe(3);
    expect(endHandler).toHaveBeenCalledTimes(1);
    expect(endHandler.mock.calls[0][0].detail.total).toBe(3);

    document.removeEventListener('pl-run-all-start', startHandler);
    document.removeEventListener('pl-run-all-end', endHandler);
  });

  it('returns empty result when no elements registered', async () => {
    for (const el of getRegisteredElements()) {
      unregisterElement(el);
    }

    const result = await window.PanelLive.runAll();
    expect(result.total).toBe(0);
    expect(result.errors).toBe(0);
  });
});
