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
const _HEADLESS_MODES = new Set(["headless", "compact", "debug"]);

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

  // Create the <panel-live> element
  const plEl = document.createElement("panel-live");
  _applyAttributes(plEl, model);

  // Set code content
  plEl.textContent = model.code;

  // Set requirements as data attribute
  if (model.requirements && model.requirements.length > 0) {
    plEl.setAttribute("data-requirements", model.requirements.join(","));
  }

  container.appendChild(plEl);

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

  // Watch for code changes — update the element's controller
  model.on("code", () => {
    // If the <panel-live> element has an updateCode method (from the
    // web component), use it.  Otherwise fall back to textContent.
    if (plEl._controller && typeof plEl._controller.updateCode === "function") {
      plEl._controller.updateCode(model.code);
    } else {
      plEl.textContent = model.code;
    }
  });

  // Listen for <panel-live> status events
  plEl.addEventListener("pl-status", (event) => {
    if (event.detail && event.detail.status) {
      model.status = event.detail.status;
    }
  });

  plEl.addEventListener("pl-error", (event) => {
    if (event.detail && event.detail.message) {
      model.error = event.detail.message;
    }
  });

  // --- Bidirectional messaging ---

  // Handle custom messages from server (send() and run_python())
  model.on("msg:custom", (event) => {
    const msg = event.detail ? event.detail[0] : event;
    if (!msg || !msg.type) return;

    if (msg.type === "server_data") {
      // Dispatch server data to the <panel-live> element
      plEl.dispatchEvent(
        new CustomEvent("pl-server-data", {
          detail: { data: msg.data },
          bubbles: false,
        }),
      );
    } else if (msg.type === "run_python") {
      // Forward run_python request to the worker via the controller
      _runPythonInWorker(plEl, msg, model);
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

// ---------- run_python helper ----------

async function _runPythonInWorker(plEl, msg, model) {
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
    // Try to use the controller's run method if available
    let result = null;
    if (plEl._controller && typeof plEl._controller.run === "function") {
      result = await plEl._controller.run(fullCode);
    }
    model.send_msg({
      type: "run_python_result",
      request_id: request_id,
      result: result,
    });
  } catch (err) {
    model.send_msg({
      type: "run_python_error",
      request_id: request_id,
      error: String(err),
    });
  }
}
