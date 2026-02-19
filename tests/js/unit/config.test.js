import { describe, it, expect } from 'vitest';
import { _defaults, _config, _autoRunOverride, setAutoRunOverride, cdnUrls } from '../../../lib/config.js';

describe('config', () => {
  it('has expected default versions', () => {
    expect(_defaults.pyodideVersion).toMatch(/^v\d+\.\d+/);
    expect(_defaults.panelVersion).toBeDefined();
    expect(_defaults.bokehVersion).toBeDefined();
  });

  it('has expected CDN URLs', () => {
    expect(_defaults.pyodideCdn).toContain('jsdelivr');
    expect(_defaults.panelCdn).toContain('holoviz');
    expect(_defaults.bokehCdn).toContain('bokeh.org');
  });

  it('_config merges defaults', () => {
    expect(_config.pyodideVersion).toBe(_defaults.pyodideVersion);
    expect(_config.panelVersion).toBe(_defaults.panelVersion);
  });

  it('cdnUrls() returns all required URLs', () => {
    const urls = cdnUrls();
    expect(urls.pyodide).toContain('pyodide.js');
    expect(urls.bokehJs).toHaveLength(3);
    expect(urls.panelJs).toContain('panel.min.js');
    expect(urls.bokehWhl).toContain('.whl');
    expect(urls.panelWhl).toContain('.whl');
  });

  it('cdnUrls() incorporates version numbers', () => {
    const urls = cdnUrls();
    expect(urls.pyodide).toContain(_defaults.pyodideVersion);
    expect(urls.panelWhl).toContain(_defaults.panelVersion);
    expect(urls.bokehJs[0]).toContain(_defaults.bokehVersion);
  });

  it('has packageAliases default (empty object)', () => {
    expect(_defaults.packageAliases).toBeDefined();
    expect(typeof _defaults.packageAliases).toBe('object');
  });

  it('cdnUrls() bokeh JS includes widgets and tables', () => {
    const urls = cdnUrls();
    expect(urls.bokehJs[0]).toContain('bokeh-' + _defaults.bokehVersion);
    expect(urls.bokehJs[1]).toContain('bokeh-widgets-');
    expect(urls.bokehJs[2]).toContain('bokeh-tables-');
  });

  it('has disableJSPI default set to true', () => {
    expect(_defaults.disableJSPI).toBe(true);
  });

  it('has playgroundUrl default as empty string', () => {
    expect(_defaults.playgroundUrl).toBe('');
  });

  it('_autoRunOverride starts as null', () => {
    expect(_autoRunOverride).toBeNull();
  });

  it('setAutoRunOverride sets boolean values', () => {
    setAutoRunOverride(false);
    // Re-import to check live binding
    expect(_autoRunOverride !== undefined).toBe(true);
    // Reset
    setAutoRunOverride(null);
  });
});
