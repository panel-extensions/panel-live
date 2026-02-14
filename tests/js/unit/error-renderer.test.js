import { describe, it, expect, beforeEach } from 'vitest';
import { renderError } from '../../../lib/error-renderer.js';

describe('renderError', () => {
  let el;

  beforeEach(() => {
    el = document.createElement('div');
  });

  it('renders error message', () => {
    renderError(el, 'NameError: x is not defined');
    expect(el.querySelector('.pl-error-header').textContent)
      .toBe('NameError: x is not defined');
  });

  it('escapes HTML in error messages', () => {
    renderError(el, '<script>alert("xss")</script>');
    expect(el.innerHTML).not.toContain('<script>');
    expect(el.innerHTML).toContain('&lt;script&gt;');
  });

  it('parses error type and message from traceback', () => {
    const tb = `Traceback (most recent call last):
  File "<exec>", line 3, in <module>
    x = 1 / 0
ZeroDivisionError: division by zero`;
    renderError(el, tb);
    expect(el.querySelector('.pl-error-header').textContent)
      .toBe('ZeroDivisionError: division by zero');
  });

  it('shows user code frames from traceback', () => {
    const tb = `Traceback (most recent call last):
  File "_pyodide/_base.py", line 500, in eval_code_async
    exec(code, ns)
  File "<exec>", line 3, in <module>
    x = 1 / 0
ZeroDivisionError: division by zero`;
    renderError(el, tb);
    const trace = el.querySelector('.pl-error-trace');
    expect(trace).not.toBeNull();
    // Should show user frame (line 3) but not internal frame (_pyodide)
    expect(trace.textContent).toContain('Line 3');
  });

  it('shows collapsible full traceback when internal frames exist', () => {
    const tb = `Traceback (most recent call last):
  File "_pyodide/_base.py", line 500, in eval_code_async
    exec(code, ns)
  File "<exec>", line 3, in <module>
    x = 1 / 0
ZeroDivisionError: division by zero`;
    renderError(el, tb);
    const details = el.querySelector('.pl-error-details');
    expect(details).not.toBeNull();
    expect(details.querySelector('summary').textContent).toContain('2 frames');
  });

  it('does not show collapsible traceback when only user frames exist', () => {
    const tb = `Traceback (most recent call last):
  File "<exec>", line 3, in <module>
    x = 1 / 0
ZeroDivisionError: division by zero`;
    renderError(el, tb);
    expect(el.querySelector('.pl-error-details')).toBeNull();
  });

  it('creates a copy button', () => {
    renderError(el, 'SomeError: oops');
    expect(el.querySelector('.pl-error-copy-btn')).not.toBeNull();
    expect(el.querySelector('.pl-error-copy-btn').textContent).toBe('Copy error');
  });

  it('handles empty error message', () => {
    renderError(el, '');
    expect(el.querySelector('.pl-error-panel')).not.toBeNull();
  });

  it('handles null error message', () => {
    renderError(el, null);
    expect(el.querySelector('.pl-error-panel')).not.toBeNull();
  });

  it('falls back to last frame when no user frames exist', () => {
    const tb = `Traceback (most recent call last):
  File "/lib/python3.12/site-packages/panel/io/mime_render.py", line 42, in exec_with_return
    result = eval(code, ns)
ValueError: bad value`;
    renderError(el, tb);
    const trace = el.querySelector('.pl-error-trace');
    expect(trace).not.toBeNull();
    expect(trace.textContent).toContain('Line 42');
  });

  // --- Fix 2: Non-Python error rendering ---

  it('renders non-Python system errors without traceback parsing', () => {
    const msg = 'panel-live cannot run from a local file (file:// protocol). Serve the page via HTTP.';
    renderError(el, msg);
    const panel = el.querySelector('.pl-error-panel');
    expect(panel).not.toBeNull();
    expect(panel.classList.contains('pl-system-error')).toBe(true);
    expect(panel.querySelector('.pl-error-header').textContent).toBe(msg);
    // Should NOT have traceback, copy button, or details
    expect(el.querySelector('.pl-error-trace')).toBeNull();
    expect(el.querySelector('.pl-error-copy-btn')).toBeNull();
    expect(el.querySelector('.pl-error-details')).toBeNull();
  });

  it('renders timeout errors as system errors', () => {
    const msg = 'Initialization timed out after 120s. The CDN may be unreachable. Try refreshing the page.';
    renderError(el, msg);
    expect(el.querySelector('.pl-system-error')).not.toBeNull();
    expect(el.querySelector('.pl-error-header').textContent).toBe(msg);
  });

  it('renders worker crash messages as system errors', () => {
    const msg = 'Worker error: Network error loading the worker script.';
    renderError(el, msg);
    expect(el.querySelector('.pl-system-error')).not.toBeNull();
  });

  it('escapes HTML in system error messages', () => {
    const msg = '<img onerror=alert(1)> broken';
    renderError(el, msg);
    expect(el.innerHTML).not.toContain('<img');
    expect(el.innerHTML).toContain('&lt;img');
  });

  it('still renders Python-like errors with full traceback handling', () => {
    // Errors that contain "Error:" should still go through Python parsing
    const msg = 'ValueError: something went wrong';
    renderError(el, msg);
    // Should have the copy button (Python path)
    expect(el.querySelector('.pl-error-copy-btn')).not.toBeNull();
  });
});
