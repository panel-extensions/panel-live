// Theme resolution

export const _darkMQ = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : { matches: false, addEventListener() {}, removeEventListener() {} };

export function resolveTheme(themeAttr) {
  if (themeAttr === 'light' || themeAttr === 'dark') return themeAttr;
  // Check MkDocs Material theme toggle
  const mdScheme = typeof document !== 'undefined' && document.body && document.body.dataset.mdColorScheme;
  if (mdScheme) return mdScheme === 'slate' ? 'dark' : 'light';
  // Fall back to system preference
  return _darkMQ.matches ? 'dark' : 'light';
}
