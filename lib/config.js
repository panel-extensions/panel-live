// Configuration (merged: built-in defaults < window global < configure())

export const _defaults = {
  pyodideVersion: 'v0.28.2',
  panelVersion: '1.8.7',
  bokehVersion: '3.8.2',
  pyodideCdn: 'https://cdn.jsdelivr.net/pyodide/',
  panelCdn: 'https://cdn.holoviz.org/panel/',
  bokehCdn: 'https://cdn.bokeh.org/bokeh/release/',
  styleNonce: '',
  packageAliases: {},
};

export const _config = Object.assign(
  {},
  _defaults,
  typeof window !== 'undefined' && window.PANEL_LIVE_CONFIG ? window.PANEL_LIVE_CONFIG : {}
);

export function cdnUrls() {
  const { pyodideVersion, panelVersion, bokehVersion, pyodideCdn, panelCdn, bokehCdn } = _config;
  return {
    pyodide: `${pyodideCdn}${pyodideVersion}/full/pyodide.js`,
    bokehJs: [
      `${bokehCdn}bokeh-${bokehVersion}.js`,
      `${bokehCdn}bokeh-widgets-${bokehVersion}.min.js`,
      `${bokehCdn}bokeh-tables-${bokehVersion}.min.js`,
    ],
    panelJs: `https://cdn.jsdelivr.net/npm/@holoviz/panel@${panelVersion}/dist/panel.min.js`,
    bokehWhl: `${panelCdn}${panelVersion}/dist/wheels/bokeh-${bokehVersion}-py3-none-any.whl`,
    panelWhl: `${panelCdn}${panelVersion}/dist/wheels/panel-${panelVersion}-py3-none-any.whl`,
  };
}
