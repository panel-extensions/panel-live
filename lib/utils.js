// Utility functions: unique IDs, script/CSS loading, URL helpers

import { _config } from './config.js';

let _idCounter = 0;
export function uid() { return 'pl-' + (++_idCounter); }

export function loadScript(url) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = url;
    s.crossOrigin = 'anonymous';
    if (_config.styleNonce) s.nonce = _config.styleNonce;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load ' + url));
    document.head.appendChild(s);
  });
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
