// Theme resolution and centralized theme-change observation

export const _darkMQ = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : { matches: false, addEventListener() {}, removeEventListener() {} };

export function resolveTheme(themeAttr) {
  if (themeAttr === 'light' || themeAttr === 'dark') return themeAttr;

  // pydata-sphinx-theme: data-theme on <html>
  if (typeof document !== 'undefined' && document.documentElement) {
    const pydata = document.documentElement.dataset.theme;
    if (pydata === 'light' || pydata === 'dark') return pydata;
  }

  // furo: data-theme on <body> (light/dark/auto — resolve auto via OS preference)
  if (typeof document !== 'undefined' && document.body) {
    const furo = document.body.dataset.theme;
    if (furo === 'light' || furo === 'dark') return furo;
    if (furo === 'auto') return _darkMQ.matches ? 'dark' : 'light';
  }

  // MkDocs Material: data-md-color-scheme on <body>
  if (typeof document !== 'undefined' && document.body) {
    const mdScheme = document.body.dataset.mdColorScheme;
    if (mdScheme) return mdScheme === 'slate' ? 'dark' : 'light';
  }

  // Fall back to system preference
  return _darkMQ.matches ? 'dark' : 'light';
}

// --- Centralized theme change singleton ---

let _subscribers = [];
let _observerInitialized = false;
let _lastResolved = null;

function _notify() {
  const resolved = resolveTheme('auto');
  if (resolved === _lastResolved) return;
  _lastResolved = resolved;
  for (const cb of _subscribers) {
    try { cb(resolved); } catch (e) { console.warn('[panel-live] theme subscriber error:', e); }
  }
}

function _initObserver() {
  if (_observerInitialized) return;
  _observerInitialized = true;
  _lastResolved = resolveTheme('auto');

  // Watch <html> for data-theme (pydata-sphinx-theme)
  if (typeof document !== 'undefined' && document.documentElement) {
    const htmlObs = new MutationObserver(_notify);
    htmlObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // Watch <body> for data-theme (furo) and data-md-color-scheme (MkDocs Material)
  const observeBody = () => {
    if (!document.body) return;
    const bodyObs = new MutationObserver(_notify);
    bodyObs.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'data-md-color-scheme'] });
  };

  if (typeof document !== 'undefined') {
    if (document.body) {
      observeBody();
    } else {
      document.addEventListener('DOMContentLoaded', observeBody, { once: true });
    }
  }

  // Listen for OS preference changes
  _darkMQ.addEventListener('change', _notify);
}

/**
 * Subscribe to theme changes. Returns an unsubscribe function.
 * The callback receives the resolved theme ('light' or 'dark').
 */
export function onThemeChange(callback) {
  _initObserver();
  _subscribers.push(callback);
  return () => {
    _subscribers = _subscribers.filter(cb => cb !== callback);
  };
}
