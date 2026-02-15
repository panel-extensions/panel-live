// Utility functions: unique IDs, script/CSS loading, URL helpers

import { _config } from './config.js';

let _idCounter = 0;
export function uid() { return 'pl-' + (++_idCounter); }

const _scriptPromises = new Map();

export function loadScript(url) {
  if (_scriptPromises.has(url)) return _scriptPromises.get(url);
  const p = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      // Script tag exists — wait for it if still loading, otherwise resolve
      if (existing.dataset.loaded === '1') { resolve(); return; }
      existing.addEventListener('load', resolve);
      existing.addEventListener('error', () => reject(new Error('Failed to load ' + url)));
      return;
    }
    const s = document.createElement('script');
    s.src = url;
    s.crossOrigin = 'anonymous';
    if (_config.styleNonce) s.nonce = _config.styleNonce;
    s.onload = () => { s.dataset.loaded = '1'; resolve(); };
    s.onerror = () => reject(new Error('Failed to load ' + url));
    document.head.appendChild(s);
  });
  _scriptPromises.set(url, p);
  return p;
}

export function loadCSS(url) {
  if (document.querySelector(`link[href="${url}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  link.crossOrigin = 'anonymous';
  if (_config.styleNonce) link.nonce = _config.styleNonce;
  document.head.appendChild(link);
}

/**
 * Convert GitHub blob URLs to raw.githubusercontent.com URLs.
 * Passes through all other URLs unchanged.
 */
export function resolveSourceUrl(url) {
  const ghMatch = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/
  );
  if (ghMatch) {
    const [, owner, repo, branch, path] = ghMatch;
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }
  return url;
}

/**
 * Fetch a Python source file with validation.
 * Detects HTML responses (404 pages, wrong URLs) and throws a clear error.
 */
export async function fetchPythonSource(url) {
  const resolved = resolveSourceUrl(url);
  const resp = await fetch(resolved);
  if (!resp.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${resp.status}`);
  }
  const text = await resp.text();
  const contentType = resp.headers.get('content-type') || '';
  if (contentType.includes('text/html') || text.trimStart().startsWith('<!')) {
    throw new Error(
      `Expected Python source from ${url} but received HTML. ` +
      `The URL may be incorrect or pointing to a web page instead of a raw file.`
    );
  }
  return text;
}
