// ESM module for the PanelLive JSComponent.
//
// Creates a <panel-live> web component, maps model params to HTML
// attributes, and bridges bidirectional data between Panel server
// and the client-side Pyodide worker.
//
// Shadow DOM workaround
// ---------------------
// Panel's JSComponent renders into a Shadow DOM.  The <panel-live> web
// component (and Bokeh's embed_items()) rely on document.getElementById()
// which cannot see inside Shadow DOM.  Styles loaded into <head> also
// don't penetrate.  We fix both by:
//   1. Patching document.getElementById to also search the shadow root.
//   2. Mirroring <link>/<style> from <head> into the shadow root.

// ---------- Shadow DOM helpers ----------

let _getByIdPatched = false;
const _shadowRoots = new Set();

function _patchGetElementById() {
  if (_getByIdPatched) return;
  _getByIdPatched = true;
  const _origGetById = document.getElementById.bind(document);
  document.getElementById = function (id) {
    const result = _origGetById(id);
    if (result) return result;
    for (const root of _shadowRoots) {
      const el = root.getElementById(id);
      if (el) return el;
    }
    return null;
  };
}

function _injectBundleCSS(shadowRoot) {
  // Derive panel-live.css URL from the panel-live.js <script> tag.
  // The CSS is always co-located with the JS.
  const scripts = document.querySelectorAll('script[src*="panel-live"]');
  for (const s of scripts) {
    if (s.src && /panel-live(?:\.min)?\.js/.test(s.src)) {
      const cssUrl = s.src.replace(
        /panel-live(?:\.min)?\.js(\?.*)?$/,
        "panel-live.css$1",
      );
      // Inject into shadow root
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = cssUrl;
      shadowRoot.appendChild(link);
      break;
    }
  }
}

function _mirrorStylesInto(shadowRoot) {
  // Copy existing stylesheets (picks up CodeMirror, Bokeh CSS
  // that panel-live.js loads dynamically into <head>)
  for (const el of document.head.querySelectorAll(
    'link[rel="stylesheet"], style',
  )) {
    shadowRoot.appendChild(el.cloneNode(true));
  }
  // Watch for new stylesheets added later
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (
          (node.tagName === "LINK" && node.rel === "stylesheet") ||
          node.tagName === "STYLE"
        ) {
          shadowRoot.appendChild(node.cloneNode(true));
        }
      }
    }
  });
  observer.observe(document.head, { childList: true });
  return observer;
}

// ---------- Mode helpers ----------

// Modes that map to <panel-live mode="app"> with code-visibility="hidden"
const _HEADLESS_MODES = new Set(["headless", "progress", "debug"]);

function _resolveHtmlMode(mode) {
  return _HEADLESS_MODES.has(mode) ? "app" : mode;
}

// ---------- Attribute helpers ----------

function _applyAttributes(el, model) {
  const mode = _resolveHtmlMode(model.mode);
  el.setAttribute("mode", mode);
  el.setAttribute("theme", model.theme);
  el.setAttribute("layout", model.layout);
  el.setAttribute("auto-run", String(model.auto_run));

  if (_HEADLESS_MODES.has(model.mode)) {
    el.setAttribute("code-visibility", "hidden");
  } else {
    el.setAttribute("code-visibility", model.code_visibility);
  }
}

function _applyContainerStyle(container, model) {
  if (model.mode === "headless") {
    container.style.width = "0";
    container.style.height = "0";
    container.style.overflow = "hidden";
    container.style.position = "absolute";
  } else {
    container.style.width = "";
    container.style.height = "";
    container.style.overflow = "";
    container.style.position = "";
  }
}

// ---------- Progress mode helpers ----------

/* eslint-disable max-len */
const _PYTHON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#3776AB" d="M11.914 0C5.82 0 6.2 2.656 6.2 2.656l.007 2.752h5.814v.826H3.9S0 5.789 0 11.969c0 6.18 3.403 5.96 3.403 5.96h2.03v-2.867s-.109-3.42 3.35-3.42h5.766s3.24.052 3.24-3.148V3.202S18.28 0 11.914 0zM8.708 1.85a1.06 1.06 0 110 2.12 1.06 1.06 0 010-2.12z"/><path fill="#FFD43B" d="M12.086 24c6.094 0 5.714-2.656 5.714-2.656l-.007-2.752h-5.814v-.826h8.121s3.9.445 3.9-5.735c0-6.18-3.403-5.96-3.403-5.96h-2.03v2.867s.109 3.42-3.35 3.42H9.451s-3.24-.052-3.24 3.148v5.292S5.72 24 12.086 24zm3.206-1.85a1.06 1.06 0 110-2.12 1.06 1.06 0 010 2.12z"/></svg>`;
/* eslint-enable max-len */

function _createProgressIcon() {
  const wrapper = document.createElement("div");
  wrapper.className = "pl-progress-icon";
  // Inline styles ensure correct sizing even before external CSS loads
  wrapper.style.display = "inline-flex";
  wrapper.style.alignItems = "center";
  wrapper.style.justifyContent = "center";
  wrapper.style.width = "40px";
  wrapper.style.height = "40px";
  wrapper.style.padding = "4px";
  wrapper.style.cursor = "default";
  wrapper.style.position = "relative";
  wrapper.innerHTML = _PYTHON_SVG;
  const svg = wrapper.querySelector("svg");
  if (svg) {
    svg.style.width = "24px";
    svg.style.height = "24px";
  }

  // CSS tooltip — shown instantly on hover, stays visible during text updates
  const tooltip = document.createElement("span");
  tooltip.className = "pl-progress-tooltip";
  tooltip.textContent = "Ready";
  wrapper.appendChild(tooltip);

  // Inject tooltip styles (idempotent — only once per document)
  _injectTooltipStyles(wrapper);

  return wrapper;
}

const _tooltipStyleRoots = new WeakSet();
function _injectTooltipStyles(container) {
  const root = container.getRootNode();
  if (_tooltipStyleRoots.has(root)) return;
  _tooltipStyleRoots.add(root);
  const style = document.createElement("style");
  style.textContent = `
    .pl-progress-tooltip {
      display: none;
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: #f0f0f0;
      font-size: 12px;
      line-height: 1.3;
      padding: 4px 8px;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 1000;
    }
    @media (prefers-color-scheme: dark) {
      .pl-progress-tooltip {
        background: #e0e0e0;
        color: #1a1a1a;
      }
    }
    .pl-progress-icon:hover .pl-progress-tooltip {
      display: block;
    }
  `;
  // Insert into the closest root (shadow or document)
  if (root instanceof ShadowRoot) {
    root.appendChild(style);
  } else {
    document.head.appendChild(style);
  }
}

function _setProgressTooltip(icon, text) {
  const tip = icon.querySelector(".pl-progress-tooltip");
  if (tip) tip.textContent = text;
}

function _updateProgressIcon(icon, inFlight) {
  if (inFlight > 0) {
    icon.classList.add("active");
    _setProgressTooltip(
      icon,
      inFlight === 1
        ? "Evaluating\u2026"
        : `Evaluating\u2026 (${inFlight} in queue)`,
    );
  } else {
    icon.classList.remove("active");
    _setProgressTooltip(icon, "Ready");
  }
}

// ---------- render ----------

export function render({ model, view }) {
  // --- Shadow DOM workaround ---
  const shadowRoot = view.shadow_el;
  if (shadowRoot instanceof ShadowRoot) {
    _shadowRoots.add(shadowRoot);
    _patchGetElementById();
    _injectBundleCSS(shadowRoot);
    _mirrorStylesInto(shadowRoot);
  }

  const container = document.createElement("div");
  container.classList.add("panel-live-component");
  // Vertically center in flex layouts (e.g. pn.Row alongside Button widgets)
  container.style.alignSelf = "center";

  // Create the <panel-live> element
  const plEl = document.createElement("panel-live");
  _applyAttributes(plEl, model);

  // Set code content
  plEl.textContent = model.code;

  // Set requirements as data attribute
  if (model.requirements && model.requirements.length > 0) {
    plEl.setAttribute("data-requirements", model.requirements.join("\n"));
  }

  container.appendChild(plEl);

  // Progress mode: visible spinning Python icon, hidden <panel-live>
  let _progressIcon = null;
  let _evalInFlight = 0;

  if (model.mode === "progress") {
    plEl.style.display = "none";
    _progressIcon = _createProgressIcon();
    container.appendChild(_progressIcon);
  }

  // Apply container styling for headless mode
  _applyContainerStyle(container, model);

  // Watch for param changes and update attributes
  model.on("mode", () => {
    _applyAttributes(plEl, model);
    _applyContainerStyle(container, model);
  });
  model.on("theme", () => _applyAttributes(plEl, model));
  model.on("layout", () => _applyAttributes(plEl, model));
  model.on("auto_run", () => _applyAttributes(plEl, model));
  model.on("code_visibility", () => _applyAttributes(plEl, model));

  // Watch for code changes — update the editor and internal code state
  model.on("code", () => {
    plEl.setCode(model.code);
    // Also update internal _code for modes without an editor (app/headless/progress/debug)
    plEl._code = model.code;
  });

  // Listen for <panel-live> status events
  plEl.addEventListener("pl-status", (event) => {
    if (event.detail && event.detail.status) {
      model.status = event.detail.status;
      // Update progress icon for lifecycle events (only when no evals in flight)
      if (_progressIcon && _evalInFlight === 0) {
        const s = event.detail.status;
        if (s === "loading" || s === "running") {
          _progressIcon.classList.add("active");
          _setProgressTooltip(
            _progressIcon,
            s === "loading" ? "Loading Pyodide\u2026" : "Running\u2026",
          );
        } else {
          _progressIcon.classList.remove("active");
          _setProgressTooltip(
            _progressIcon,
            s === "error" ? "Error" : "Ready",
          );
        }
      }
    }
  });

  plEl.addEventListener("pl-error", (event) => {
    if (event.detail && event.detail.message) {
      model.error = event.detail.message;
    }
  });

  // --- Bidirectional messaging ---

  // Handle custom messages from server (send(), evaluate(), run())
  model.on("msg:custom", (event) => {
    const msg = event.detail ? event.detail[0] : event;
    if (!msg || !msg.type) return;

    if (msg.type === "server_data") {
      // Dispatch event (web component API contract)
      plEl.dispatchEvent(
        new CustomEvent("pl-server-data", {
          detail: { data: msg.data },
          bubbles: false,
        }),
      );
      // Also forward directly to element for worker delivery
      if (plEl.receiveServerData) {
        plEl.receiveServerData(msg.data);
      }
    } else if (msg.type === "evaluate") {
      // Forward evaluate request to the worker via eval()
      if (_progressIcon) {
        _evalInFlight++;
        _updateProgressIcon(_progressIcon, _evalInFlight);
      }
      _evaluateInWorker(plEl, msg, model).finally(() => {
        if (_progressIcon) {
          _evalInFlight--;
          _updateProgressIcon(_progressIcon, _evalInFlight);
        }
      });
    } else if (msg.type === "run") {
      // Trigger the full render pipeline programmatically
      _triggerRun(plEl, msg, model);
    }
  });

  // Listen for output data sent back from client-side code
  plEl.addEventListener("pl-output", (event) => {
    if (event.detail) {
      model.send_msg({ type: "output", data: event.detail.data });
    }
  });

  return container;
}

// ---------- evaluate helper ----------

/**
 * Strip internal Pyodide frames from an error string.
 * Keeps only the exception line and user-code frames
 * (from <exec>, <module>, <string>).
 *
 * Single-expression evals produce a sole "line 1, in <module>" frame
 * which is noise — skip it.  Multi-line code with deeper call chains
 * keeps all user frames so the caller sees line numbers and function names.
 */
function _cleanEvalError(raw) {
  const lines = raw.split("\n");

  // Extract exception line (last non-empty line)
  let excLine = raw;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i].trim();
    if (l) {
      excLine = l;
      break;
    }
  }

  // Collect user-code frames (file is <exec>, <string>, etc.)
  const userPatterns = ["<exec>", "<string>", "<ast>"];
  const userFrames = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(
      /^\s*File "(.+)", line (\d+)(?:, in (.+))?/,
    );
    if (m && userPatterns.some((p) => m[1].includes(p))) {
      let text = lines[i].trimStart();
      const lineNo = parseInt(m[2], 10);
      const func = (m[3] || "").trim();
      // Include the next line if it's indented code context
      if (i + 1 < lines.length && lines[i + 1].match(/^\s{4,}/)) {
        text += "\n    " + lines[i + 1].trim();
        i++;
      }
      userFrames.push({ text, lineNo, func });
    }
  }

  // Skip the sole top-level frame when it adds no context
  // (single-expression eval always shows "line 1, in <module>")
  const showFrames =
    userFrames.length === 1 &&
    userFrames[0].lineNo === 1 &&
    userFrames[0].func === "<module>"
      ? []
      : userFrames;

  if (showFrames.length > 0) {
    return excLine + "\n" + showFrames.map((f) => f.text).join("\n");
  }
  return excLine;
}

async function _evaluateInWorker(plEl, msg, model) {
  const { code, kwargs, request_id } = msg;

  // Build the code with kwargs injected as globals
  let fullCode = "";
  if (kwargs && Object.keys(kwargs).length > 0) {
    fullCode += "import json as _json\n";
    for (const [key, value] of Object.entries(kwargs)) {
      fullCode += `${key} = _json.loads(${JSON.stringify(JSON.stringify(value))})\n`;
    }
    fullCode += "del _json\n";
  }
  fullCode += code;

  try {
    const result = await plEl.eval(fullCode);
    model.send_msg({
      type: "evaluate_result",
      request_id: request_id,
      result: result,
    });
  } catch (err) {
    model.send_msg({
      type: "evaluate_error",
      request_id: request_id,
      error: _cleanEvalError(String(err)),
    });
  }
}

// ---------- run helper ----------

async function _triggerRun(plEl, msg, model) {
  const { request_id } = msg;
  try {
    // If code was provided, it's already synced via model.on("code")
    // which calls plEl.setCode() + plEl._code = ...
    // Now trigger the render pipeline
    await plEl.run();
    model.send_msg({ type: "run_result", request_id });
  } catch (err) {
    model.send_msg({ type: "run_error", request_id, error: String(err) });
  }
}
