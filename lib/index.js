/**
 * panel-live.js — Web Component for Panel Live
 *
 * Defines <panel-live>, <panel-file>, <panel-requirements>, and <panel-example>
 * custom elements plus the PanelLive imperative JS API.
 *
 * See dev/design/api-design.md for the full API specification.
 *
 * Usage:
 *   <script src="panel-live.js"></script>
 *   <panel-live>
 *     import panel as pn
 *     pn.panel("Hello").servable()
 *   </panel-live>
 *
 *   <panel-live mode="editor" theme="dark">
 *     import panel as pn
 *     pn.widgets.FloatSlider(name="X").servable()
 *   </panel-live>
 *
 *   <panel-live mode="playground" layout="horizontal" theme="auto">
 *     ...
 *   </panel-live>
 */

console.log('[panel-live] panel-live.js loaded');

// Cleanup stale service workers (JupyterLite/JupyterHub can
// register workers that intercept fetches and cause crashes)
if (navigator.serviceWorker && navigator.serviceWorker.controller) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    const stale = regs.filter(r => {
      const url = (r.active || r.installing || r.waiting)?.scriptURL || '';
      return !url.includes('mini-coi') && !url.includes('coi-serviceworker');
    });
    if (stale.length > 0) {
      stale.forEach(r => r.unregister());
      location.reload();
    }
  });
}

// Import all modules (side effects register custom elements, set up API)
import './config.js';
import './utils.js';
import './theme.js';
import './codemirror.js';
import './error-renderer.js';
import './worker-bridge.js';
import './helper-elements.js';
import './url-sharing.js';
import './registry.js';
import './panel-live-element.js';
import './controller.js';
import './api.js';
import './config-element.js';
import './controls-element.js';
