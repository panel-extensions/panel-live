import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { registerElement, unregisterElement, getRegisteredElements, getRegisteredCount } from '../../../lib/registry.js';

describe('registry', () => {
  let el1, el2, el3;

  beforeEach(() => {
    // Unregister any leftover elements from previous tests
    for (const el of getRegisteredElements()) {
      unregisterElement(el);
    }

    // Create real DOM elements in document order
    el1 = document.createElement('div');
    el1.id = 'first';
    el2 = document.createElement('div');
    el2.id = 'second';
    el3 = document.createElement('div');
    el3.id = 'third';
    document.body.appendChild(el1);
    document.body.appendChild(el2);
    document.body.appendChild(el3);
  });

  it('starts empty', () => {
    expect(getRegisteredCount()).toBe(0);
    expect(getRegisteredElements()).toEqual([]);
  });

  it('registers elements', () => {
    registerElement(el1);
    registerElement(el2);
    expect(getRegisteredCount()).toBe(2);
  });

  it('unregisters elements', () => {
    registerElement(el1);
    registerElement(el2);
    unregisterElement(el1);
    expect(getRegisteredCount()).toBe(1);
    expect(getRegisteredElements()).toEqual([el2]);
  });

  it('re-registration is idempotent', () => {
    registerElement(el1);
    registerElement(el1);
    expect(getRegisteredCount()).toBe(1);
  });

  it('unregister of non-registered element is a no-op', () => {
    unregisterElement(el1);
    expect(getRegisteredCount()).toBe(0);
  });

  it('returns elements sorted in document order', () => {
    // Register in reverse order
    registerElement(el3);
    registerElement(el1);
    registerElement(el2);
    const sorted = getRegisteredElements();
    expect(sorted).toEqual([el1, el2, el3]);
  });

  it('includes elements inside Shadow DOM', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const shadowEl = document.createElement('div');
    shadow.appendChild(shadowEl);

    registerElement(el1);
    registerElement(shadowEl);
    expect(getRegisteredCount()).toBe(2);
    // Both should be returned (Shadow DOM elements are included)
    const elements = getRegisteredElements();
    expect(elements).toContain(el1);
    expect(elements).toContain(shadowEl);

    // Clean up
    unregisterElement(shadowEl);
    host.remove();
  });

  // Clean up DOM after each test
  afterEach(() => {
    el1.remove();
    el2.remove();
    el3.remove();
    for (const el of getRegisteredElements()) {
      unregisterElement(el);
    }
  });
});
