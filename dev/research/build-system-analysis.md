# Build System Analysis for panel-live

Comparison of build system options for bundling `panel-live.js`, `panel-live.css`,
and future dependencies (CodeMirror 6). Current state: no build system, raw files
served directly, CodeMirror 5 loaded from CDN.

---

## 1. Current State

### What Exists

```
lib/
  panel-live.js    (~1505 lines, vanilla JS, no imports)
  panel-live.css   (~480 lines, vanilla CSS)
```

> The 1505-line monolithic file will be split into ~15 ES modules for
> development (see Section 8). The distribution remains a single bundled
> IIFE file.

- No `package.json`, no `node_modules`, no build step
- CodeMirror 5 is loaded at runtime from `cdnjs.cloudflare.com` via dynamic
  `<script>` and `<link>` tags (7 requests total)
- Pyodide, Bokeh, and Panel JS are also loaded from CDN at runtime
- The JS file is copied to `docs/assets/` via `pixi run sync-assets`
- No minification, no source maps, no tree-shaking

### Why a Build System is Needed

1. **CodeMirror 6 migration**: CM6 is ESM-only. It cannot be loaded via
   `<script>` tags from a CDN. It must be imported and bundled.
2. **CDN dependency elimination**: Loading CM5 from `cdnjs.cloudflare.com`
   is blocked by tracking prevention in some browsers (Firefox strict mode,
   Brave). Bundling eliminates this external dependency.
3. **Single-file distribution**: A self-contained JS bundle + CSS file is
   simpler to distribute, cache, and version than raw source + CDN dependencies.
4. **Minification**: The current 1470-line JS file could be reduced
   significantly with minification and dead code elimination.

### What Stays External (Not Bundled)

These resources are loaded dynamically at runtime based on configuration and
should NOT be bundled:

- Pyodide runtime (`cdn.jsdelivr.net/pyodide/`)
- Bokeh JS (`cdn.bokeh.org/`)
- Panel JS (`cdn.jsdelivr.net/npm/@holoviz/panel/`)
- Bokeh/Panel Python wheels
- Extension resources (discovered at runtime via Python introspection)

Only `panel-live.js`, `panel-live.css`, and CodeMirror 6 should be bundled.

---

## 2. Build System Options

### 2.1 esbuild

**Overview**: An extremely fast JS/CSS bundler written in Go. Designed for
simplicity and speed. Supports ESM natively.

**Pros**:
- Extremely fast (10-100x faster than Rollup/webpack)
- Simple configuration (single CLI command or ~10-line config)
- Native ESM support (ideal for CM6's ESM modules)
- Built-in CSS bundling via CSS import support
- Built-in minification (JS and CSS)
- Source map generation
- Small npm footprint (single binary, ~9MB)
- No plugin system needed for basic bundling

**Cons**:
- Limited plugin ecosystem compared to Rollup
- No built-in CSS modules or PostCSS support (not needed for panel-live)
- Less mature tree-shaking than Rollup (but good enough for CM6)
- No built-in HMR/dev server (not needed -- panel-live uses `serve.py`)

**Config complexity**: Very low. Can be a single CLI command:

```bash
npx esbuild lib/panel-live.js --bundle --outfile=dist/panel-live.js \
  --format=iife --minify --sourcemap
```

Or a ~15-line build script:

```js
// build.mjs
import { build } from 'esbuild';

await build({
  entryPoints: ['lib/panel-live.js'],
  bundle: true,
  outfile: 'dist/panel-live.js',
  format: 'iife',
  minify: true,
  sourcemap: true,
  target: ['es2020'],
  loader: { '.css': 'css' },
  external: [],  // Bundle everything
});
```

**CodeMirror 6 bundling**: Works well. CM6 is ESM-native and esbuild handles
ESM imports naturally. The CM6 team themselves recommend esbuild as a bundler
option.

**Expected output size** (estimated):
- panel-live.js + CM6 core + Python mode + themes: ~150-200KB minified
- panel-live.css: ~5-8KB minified
- Gzipped total: ~50-70KB

### 2.2 Rollup

**Overview**: The original tree-shaking bundler. Mature, well-documented,
rich plugin ecosystem. Used by many libraries for production builds.

**Pros**:
- Mature and battle-tested
- Best-in-class tree-shaking (pioneered the technique)
- Rich plugin ecosystem (PostCSS, Terser, etc.)
- CodeMirror 6 officially uses Rollup for its own builds
- Good ESM output support (can output ESM, CJS, IIFE, UMD)
- Excellent source maps

**Cons**:
- Slower than esbuild (5-10x for typical bundles)
- More configuration needed (~30-line config with plugins)
- Requires plugins for common tasks (CSS, minification, Node resolution)
- Larger npm dependency footprint (many small plugins)

**Config complexity**: Medium. Requires a config file with plugins:

```js
// rollup.config.mjs
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import css from 'rollup-plugin-css-only';

export default {
  input: 'lib/panel-live.js',
  output: {
    file: 'dist/panel-live.js',
    format: 'iife',
    name: 'PanelLiveBundle',
    sourcemap: true,
  },
  plugins: [
    nodeResolve(),
    css({ output: 'panel-live.css' }),
    terser(),
  ],
};
```

**Required npm packages**:
- `rollup`
- `@rollup/plugin-node-resolve` (resolve node_modules imports)
- `@rollup/plugin-terser` (minification)
- `rollup-plugin-css-only` or `rollup-plugin-postcss` (CSS handling)

**CodeMirror 6 bundling**: Excellent. CM6's own build uses Rollup.
Tree-shaking is superior, potentially producing a slightly smaller bundle
than esbuild.

**Expected output size**: ~140-190KB minified (slightly smaller than esbuild
due to better tree-shaking).

### 2.3 Vite

**Overview**: A modern build tool that uses esbuild for development and
Rollup for production builds. Designed primarily for applications (SPAs),
but has a library mode.

**Pros**:
- Uses Rollup under the hood (production builds get Rollup's tree-shaking)
- esbuild for development (fast HMR and dev server)
- Excellent developer experience (HMR, auto-refresh)
- Good ESM support
- Built-in CSS handling (PostCSS, CSS modules)
- TypeScript support out of the box

**Cons**:
- Designed for applications, not single-file libraries
- Library mode exists but is less mature and more opinionated
- Heavy dependency footprint (~40MB node_modules)
- Adds complexity not needed for panel-live's simple use case
- Dev server is redundant (panel-live already has `serve.py` with COOP/COEP)
- HMR adds no value for a web component that needs Pyodide (reload is required anyway)

**Config complexity**: Low for apps, medium for library mode:

```js
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'lib/panel-live.js',
      name: 'PanelLiveBundle',
      fileName: 'panel-live',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        assetFileNames: 'panel-live.[ext]',
      },
    },
    sourcemap: true,
    minify: 'terser',
  },
});
```

**CodeMirror 6 bundling**: Excellent (uses Rollup internally).

**Expected output size**: Same as Rollup (~140-190KB) since it uses
Rollup for production.

---

## 3. Evaluation Matrix

| Criterion | esbuild | Rollup | Vite |
|-----------|---------|--------|------|
| **Config simplicity** | Excellent (1 CLI or 15 lines) | Good (30 lines + plugins) | Good (20 lines, but library mode quirks) |
| **Build speed** | Excellent (~50ms) | Good (~2s) | Good (~2s, Rollup under the hood) |
| **CM6 bundling** | Excellent | Excellent (CM6's own choice) | Excellent |
| **Tree-shaking** | Good | Excellent | Excellent (Rollup) |
| **Source maps** | Excellent | Excellent | Excellent |
| **Output: single JS + CSS** | Yes | Yes (with plugin) | Yes |
| **npm footprint** | ~9MB | ~25MB (with plugins) | ~40MB |
| **Minification** | Built-in | Plugin (Terser) | Built-in |
| **CSS handling** | Built-in (basic) | Plugin needed | Built-in |
| **Dev server / HMR** | No (not needed) | No (not needed) | Yes (not needed) |
| **Maintenance burden** | Very low | Low | Medium |
| **Learning curve** | Very low | Low | Low-medium |

---

## 4. Recommendation: esbuild

For panel-live's specific requirements -- a single JS file, a single CSS file,
and a CodeMirror 6 dependency -- **esbuild is the best fit**. The reasoning:

1. **Simplicity**: panel-live is not a complex application. It has one JS entry
   point, one CSS file, and one external dependency to bundle (CM6). esbuild
   handles this with a single command or minimal config.

2. **Speed**: Build times under 100ms mean the build step is invisible in the
   development workflow. No watch mode or incremental builds needed.

3. **Minimal footprint**: One npm dependency (~9MB) vs. 5+ dependencies for
   Rollup or 20+ for Vite. This matters for a project that currently has
   zero JS build infrastructure.

4. **Good enough tree-shaking**: While Rollup's tree-shaking is theoretically
   superior, the difference for CM6 bundling is typically 5-15KB. Not
   significant enough to justify Rollup's added complexity.

5. **No wasted features**: Vite's dev server, HMR, and app-oriented features
   add no value for panel-live. The existing `serve.py` with COOP/COEP headers
   is needed regardless.

### 4.1 Recommended Configuration

**`package.json`** (new file):

```json
{
  "private": true,
  "name": "panel-live",
  "scripts": {
    "build": "node build.mjs",
    "build:dev": "node build.mjs --dev",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "esbuild": "^0.24.0",
    "vitest": "^3.0.0",
    "jsdom": "^25.0.0",
    "@vitest/coverage-v8": "^3.0.0",
    "@codemirror/state": "^6.4.0",
    "@codemirror/view": "^6.34.0",
    "@codemirror/lang-python": "^6.1.0",
    "@codemirror/language": "^6.10.0",
    "@codemirror/autocomplete": "^6.18.0",
    "@codemirror/commands": "^6.7.0",
    "@codemirror/theme-one-dark": "^6.1.0"
  }
}
```

**`build.mjs`** (new file):

```js
import { build } from 'esbuild';

const isDev = process.argv.includes('--dev');

// Bundle JS
await build({
  entryPoints: ['lib/index.js'],
  bundle: true,
  outfile: 'dist/panel-live.js',
  format: 'iife',
  minify: !isDev,
  sourcemap: true,
  target: ['es2020'],
  define: {
    'process.env.NODE_ENV': isDev ? '"development"' : '"production"',
  },
});

// Bundle CSS (separate entry point to keep it as a standalone file)
await build({
  entryPoints: ['lib/panel-live.css'],
  bundle: true,
  outfile: 'dist/panel-live.css',
  minify: !isDev,
  sourcemap: true,
});

console.log(isDev ? 'Dev build complete' : 'Production build complete');
```

### 4.2 Integration with Existing Workflow

The build step integrates cleanly with the existing pixi-based workflow:

```toml
# Addition to pixi.toml
[tasks]
build-js = { cmd = "npm run build", depends-on = ["npm-install"] }
build-js-dev = { cmd = "npm run build:dev", depends-on = ["npm-install"] }
npm-install = { cmd = "npm install" }
sync-assets = { cmd = "cp dist/panel-live.js dist/panel-live.css docs/assets/" }
test-js = { cmd = "npm test", depends-on = ["npm-install"] }
test-js-coverage = { cmd = "npm run test:coverage", depends-on = ["npm-install"] }
test-all = { cmd = "pixi run test && pixi run test-js" }
```

The `sync-assets` task would change from copying `lib/` files to copying
`dist/` files. The `lib/` directory remains the source; `dist/` contains
the bundled output.

The `test-all` task runs both Python (pytest) and JS (Vitest) test suites
sequentially, suitable for CI.

### 4.3 Directory Structure After Build System

```
lib/                           # Source ES modules (see Section 8)
  index.js                     # Entry point — imports all, service worker cleanup
  config.js                    # _defaults, _config, cdnUrls()
  utils.js                     # uid(), loadScript(), loadCSS()
  pyodide-runtime.js           # Singleton Pyodide init, package tracking
  package-manager.js           # detectAndInstallRequirements(), installExplicitRequirements()
  execution-queue.js           # cleanupContainer(), enqueueExecution()
  error-renderer.js            # renderError()
  panel-executor.js            # runPanelCode() (3 branches)
  theme.js                     # resolveTheme(), media query
  codemirror.js                # CM loading + createCMEditor()
  helper-elements.js           # <panel-file>, <panel-requirements>, <panel-example>
  url-sharing.js               # encodeCode(), decodeCode(), hash helpers
  panel-live-element.js        # <panel-live> custom element
  controller.js                # PanelLiveController
  api.js                       # window.PanelLive public API
  panel-live.css               # Source CSS
dist/                          # Build output (gitignored)
  panel-live.js                # Bundled + minified JS (single IIFE)
  panel-live.js.map            # Source map
  panel-live.css               # Minified CSS
  panel-live.css.map           # Source map
tests/js/                      # JS unit + integration tests (see Section 9)
  unit/
    config.test.js
    url-sharing.test.js
    error-renderer.test.js
    theme.test.js
    utils.test.js
  integration/
    panel-live-element.test.js
    helper-elements.test.js
vitest.config.js               # Vitest configuration
package.json                   # npm scripts + devDependencies
build.mjs                      # esbuild build script
docs/assets/                   # Copied from dist/ by sync-assets
  panel-live.js
  panel-live.css
```

---

## 5. Build System vs. CDN-Only Alternative

Before committing to a build system, it is worth considering whether CM6
could be loaded from a CDN without a build step. The answer is no, for
practical purposes:

1. **CM6 is ESM-only**: It uses `import`/`export` syntax. No UMD or IIFE
   builds are published.

2. **Many small modules**: A minimal CM6 setup requires 6-10 packages
   (`@codemirror/state`, `@codemirror/view`, `@codemirror/lang-python`,
   `@codemirror/language`, `@codemirror/autocomplete`, `@codemirror/commands`,
   `@codemirror/theme-one-dark`). Loading these individually from a CDN
   via `<script type="module">` would create a waterfall of 30+ HTTP requests
   as each module resolves its own imports.

3. **CDN ESM services** (like esm.sh or jspm.io) can serve pre-bundled
   ESM modules, but they introduce a runtime CDN dependency -- the same
   problem panel-live has with CM5 and `cdnjs.cloudflare.com`.

A build system is the correct approach for CM6.

---

## 6. Migration Path

### Step 1: Add Build Infrastructure (No Behavior Change)

- Add `package.json` and `build.mjs`
- Configure esbuild to bundle the existing `panel-live.js` as-is (no CM6 yet)
- Update `sync-assets` to copy from `dist/` instead of `lib/`
- Verify the bundled output works identically to the raw file
- Add `dist/` and `node_modules/` to `.gitignore`

### Step 2: Add JS Testing Infrastructure

- Add Vitest, jsdom, and `@vitest/coverage-v8` to `devDependencies`
- Create `vitest.config.js` with jsdom environment (see Section 9.6)
- Create `tests/js/unit/` and `tests/js/integration/` directories
- Write initial tests against the existing monolithic file to establish
  baseline coverage for pure functions (`cdnUrls`, `encodeCode`, etc.)
- Add `test-js`, `test-js-coverage`, and `test-all` pixi tasks

### Step 3: Split Source into ES Modules

- Extract one module at a time from `panel-live.js` (see Section 8)
- After each extraction: run esbuild, diff the bundled output against the
  previous build to confirm no behavior change
- Add/update unit tests for each extracted module
- Recommended extraction order (leaf dependencies first):
  1. `config.js` (no internal imports)
  2. `utils.js` (no internal imports)
  3. `theme.js` (no internal imports)
  4. `url-sharing.js` (no internal imports)
  5. `error-renderer.js` (no internal imports)
  6. `codemirror.js` (imports `utils.js`)
  7. `pyodide-runtime.js` (imports `config.js`, `utils.js`)
  8. `package-manager.js` (imports `pyodide-runtime.js`, `utils.js`)
  9. `execution-queue.js` (no internal imports)
  10. `panel-executor.js` (imports several modules)
  11. `helper-elements.js` (no internal imports)
  12. `controller.js` (no internal imports beyond element reference)
  13. `panel-live-element.js` (imports most modules)
  14. `api.js` (imports element + controller)
  15. `index.js` (imports all, service worker cleanup)

### Step 4: Bundle CodeMirror 6 (See `codemirror6-migration.md`)

- Add CM6 npm packages to `package.json`
- Replace the dynamic CDN loading (`loadCodeMirror()`) with ESM imports
  in `codemirror.js`
- Replace `createCMEditor()` with CM6 `EditorView` creation
- Bundle everything into a single `dist/panel-live.js`

### Step 5: Optional Optimizations

- CSS minification
- Code splitting (if worker file is added later)
- Bundle analysis (`esbuild --analyze` or `esbuild-visualizer`)

---

## 7. Bundle Size Estimates

| Component | Raw Size | Minified | Gzipped |
|-----------|----------|----------|---------|
| panel-live.js (current) | ~45KB | ~22KB | ~7KB |
| panel-live.css (current) | ~15KB | ~10KB | ~3KB |
| CM6 core (@codemirror/state + view) | ~250KB | ~90KB | ~30KB |
| CM6 Python language | ~25KB | ~12KB | ~4KB |
| CM6 theme-one-dark | ~5KB | ~3KB | ~1KB |
| CM6 extensions (brackets, etc.) | ~30KB | ~15KB | ~5KB |
| **Total (JS)** | **~355KB** | **~142KB** | **~47KB** |
| **Total (CSS)** | **~15KB** | **~10KB** | **~3KB** |

For comparison, the current CM5 CDN loads are:
- `codemirror.min.js`: ~130KB
- `python.min.js`: ~10KB
- 4 addon scripts: ~15KB total
- 2 CSS files: ~12KB total
- **Total CM5**: ~167KB (but loaded from CDN, not bundled)

The bundled CM6 approach results in a similar total download size but
eliminates the CDN dependency and reduces HTTP requests from 7 to 1 (JS)
+ 1 (CSS).

---

## 8. Multi-File Source Architecture

### 8.1 Rationale

The current `lib/panel-live.js` is a 1505-line monolithic file. While
functional, this creates several development problems:

- **Maintainability**: Navigating a single 1500+ line file is slow.
  Developers must search for section headers (`// ====`) to find code.
- **Merge conflicts**: Any two changes in the same file can conflict,
  even if they touch unrelated functionality.
- **Testability**: A monolithic file with no exports makes unit testing
  impossible. Functions like `cdnUrls()`, `encodeCode()`, and
  `resolveTheme()` are pure functions that should be individually testable
  but are currently trapped in a closure with no way to import them.
- **Code review**: Reviewers cannot tell at a glance which subsystem a
  change affects when the diff is in a single file.

Splitting the source into ES modules solves all four problems while the
esbuild bundler produces the exact same single-file IIFE distribution.

### 8.2 Proposed Module Structure

The split follows the existing `// ====` section boundaries in
`panel-live.js`. Each section becomes its own module:

| Module | Current Lines (approx) | Purpose |
|--------|----------------------|---------|
| `index.js` | 26-38 | Entry point: service worker cleanup, imports all modules |
| `config.js` | 40-72 | `_defaults`, `_config`, `cdnUrls()` |
| `utils.js` | 84-103, 430-431 | `uid()`, `loadScript()`, `loadCSS()` |
| `pyodide-runtime.js` | 74-82, 164-207 | Singleton Pyodide init (`initPyodide()`), state vars, `loadJSResources()` |
| `package-manager.js` | 209-260 | `detectAndInstallRequirements()`, `installExplicitRequirements()`, `loadExtensionResources()` |
| `execution-queue.js` | 262-283 | `cleanupContainer()`, `enqueueExecution()` |
| `error-renderer.js` | 285-309 | `renderError()` |
| `panel-executor.js` | 311-424 | `runPanelCode()` (3 execution branches) |
| `theme.js` | 436-446 | `resolveTheme()`, `_darkMQ` media query |
| `codemirror.js` | 105-162 | CM loading (`loadCodeMirror()`) + `createCMEditor()` |
| `helper-elements.js` | 448-491 | `<panel-file>`, `<panel-requirements>`, `<panel-example>` |
| `url-sharing.js` | 493-521 | `encodeCode()`, `decodeCode()`, `getCodeFromHash()`, `setCodeInHash()` |
| `panel-live-element.js` | 523-1385 | `<panel-live>` custom element class + `customElements.define()` |
| `controller.js` | 1388-1417 | `PanelLiveController` class |
| `api.js` | 1419-1505 | `window.PanelLive` public API object |

### 8.3 Module Dependency Graph

```
index.js
├── config.js               (no deps)
├── utils.js                (no deps)
├── theme.js                (no deps)
├── url-sharing.js          (no deps)
├── error-renderer.js       (no deps)
├── execution-queue.js      (no deps)
├── codemirror.js           ← utils.js
├── pyodide-runtime.js      ← config.js, utils.js
├── package-manager.js      ← pyodide-runtime.js, utils.js
├── panel-executor.js       ← pyodide-runtime.js, package-manager.js,
│                              execution-queue.js, error-renderer.js
├── helper-elements.js      (no deps)
├── panel-live-element.js   ← theme.js, utils.js, url-sharing.js,
│                              codemirror.js, panel-executor.js,
│                              execution-queue.js, error-renderer.js
├── controller.js           (no deps, references element by constructor arg)
└── api.js                  ← pyodide-runtime.js, controller.js
```

Leaf modules (no internal imports): `config.js`, `utils.js`, `theme.js`,
`url-sharing.js`, `error-renderer.js`, `execution-queue.js`,
`helper-elements.js`, `controller.js`. These are the easiest to extract
and test first.

### 8.4 ESM-to-IIFE Bundling Pattern

Source modules use standard `import`/`export`. esbuild bundles everything
into a single IIFE with no exports (the same pattern as the current
monolithic file).

**Source module** (`lib/config.js`):

```js
export const _defaults = {
  pyodideVersion: 'v0.28.2',
  panelVersion: '1.8.7',
  // ...
};

export const _config = Object.assign({}, _defaults,
  typeof window !== 'undefined' && window.PANEL_LIVE_CONFIG
    ? window.PANEL_LIVE_CONFIG : {}
);

export function cdnUrls() {
  const { pyodideVersion, panelVersion, bokehVersion, pyodideCdn, panelCdn, bokehCdn } = _config;
  return { /* ... */ };
}
```

**Entry point** (`lib/index.js`):

```js
// Service worker cleanup (runs immediately)
if (navigator.serviceWorker && navigator.serviceWorker.controller) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    const had = regs.length > 0;
    regs.forEach(r => r.unregister());
    if (had) location.reload();
  });
}

// Import all modules (side effects register custom elements, set up API)
import './config.js';
import './utils.js';
import './theme.js';
import './codemirror.js';
import './pyodide-runtime.js';
import './package-manager.js';
import './execution-queue.js';
import './error-renderer.js';
import './panel-executor.js';
import './helper-elements.js';
import './url-sharing.js';
import './panel-live-element.js';
import './controller.js';
import './api.js';

console.log('[panel-live] panel-live.js loaded');
```

**esbuild output**: A single IIFE wrapping all module code, identical in
behavior to the current monolithic file. No `import`/`export` statements
remain in the output.

### 8.5 esbuild Config Impact

The only change to `build.mjs` is the entry point:

```diff
- entryPoints: ['lib/panel-live.js'],
+ entryPoints: ['lib/index.js'],
```

Everything else (format, minification, source maps, target) stays the
same. esbuild automatically resolves all `import` statements and inlines
the modules.

### 8.6 Incremental Migration

The split can be done one module at a time:

1. Create the new module file (e.g., `lib/config.js`)
2. Move the relevant code from `panel-live.js`, adding `export` keywords
3. Add `import` statements in `panel-live.js` for the extracted code
4. Run `node build.mjs` and diff the output against the previous build
5. Run existing Playwright E2E tests to verify no regression
6. Write unit tests for the new module
7. Repeat for the next module

At any point during migration, the project is in a working state: some
code lives in separate modules, some remains in the shrinking main file,
and the bundled output is identical.

---

## 9. JavaScript Testing Infrastructure

### 9.1 Current State

- **Python tests**: pytest with fixtures in `tests/conftest.py`
- **E2E tests**: Playwright browser tests in `tests/ui/` (tagged with
  `pytest.mark.ui`, run with `--ui` flag)
- **JS unit tests**: None. Zero coverage of JavaScript functions.

The lack of JS unit tests means that pure functions like `cdnUrls()`,
`encodeCode()`/`decodeCode()`, `resolveTheme()`, and `renderError()` are
only tested indirectly through Playwright E2E tests, which are slow and
don't isolate failures.

### 9.2 Framework Comparison: Vitest vs Jest

| Criterion | Vitest | Jest |
|-----------|--------|------|
| **ESM support** | Native (built on Vite/esbuild) | Requires `--experimental-vm-modules` or transform |
| **Speed** | Fast (uses esbuild for transforms) | Slower (uses Babel by default) |
| **Configuration** | Minimal for ESM projects | More config needed for ESM |
| **jsdom support** | Built-in via `environment: 'jsdom'` | Built-in via `testEnvironment: 'jsdom'` |
| **Watch mode** | Built-in, fast | Built-in |
| **Coverage** | `@vitest/coverage-v8` (V8 native) | `--coverage` (Istanbul or V8) |
| **Ecosystem alignment** | Shares esbuild with our build system | Separate toolchain |
| **API compatibility** | Jest-compatible (`describe`/`it`/`expect`) | — |
| **npm footprint** | ~15MB | ~30MB |

**Recommendation: Vitest**. It has native ESM support (no configuration
gymnastics), uses esbuild internally (same as our build system), is
lighter, faster, and its API is Jest-compatible so the learning curve is
zero for anyone who has used Jest.

### 9.3 What to Test Where

| Test type | Framework | What to test |
|-----------|-----------|--------------|
| **Unit** | Vitest | Pure functions: `cdnUrls()`, `encodeCode()`/`decodeCode()`, `resolveTheme()`, `renderError()`, `uid()`, `cleanupContainer()` |
| **Integration** | Vitest + jsdom | Custom element registration, attribute parsing, DOM rendering, theme data attribute, event emission (`pl-status`, `pl-ready`) |
| **E2E** | Playwright (existing) | Full Pyodide init, code execution, editor interactions, multi-file workflows, URL sharing round-trips |

The boundary is clear: if it doesn't need Pyodide or a real browser, it's
a unit/integration test. If it needs Pyodide or real browser APIs (service
workers, real network), it's an E2E test.

### 9.4 Test Directory Structure

```
tests/
  js/
    unit/
      config.test.js
      utils.test.js
      url-sharing.test.js
      error-renderer.test.js
      theme.test.js
      execution-queue.test.js
    integration/
      panel-live-element.test.js
      helper-elements.test.js
  ui/                            # Existing Playwright tests (unchanged)
    ...
```

### 9.5 Example Test Files

**`tests/js/unit/config.test.js`**:

```js
import { describe, it, expect } from 'vitest';
import { _defaults, cdnUrls } from '../../lib/config.js';

describe('config', () => {
  it('has expected default versions', () => {
    expect(_defaults.pyodideVersion).toMatch(/^v\d+\.\d+/);
    expect(_defaults.panelVersion).toBeDefined();
    expect(_defaults.bokehVersion).toBeDefined();
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
  });
});
```

**`tests/js/unit/url-sharing.test.js`**:

```js
import { describe, it, expect } from 'vitest';
import { encodeCode, decodeCode } from '../../lib/url-sharing.js';

describe('url-sharing', () => {
  it('round-trips ASCII code', () => {
    const code = 'import panel as pn\npn.panel("Hello").servable()';
    expect(decodeCode(encodeCode(code))).toBe(code);
  });

  it('round-trips Unicode code', () => {
    const code = '# Comment with emoji: 🎉\nprint("héllo")';
    expect(decodeCode(encodeCode(code))).toBe(code);
  });

  it('handles empty string', () => {
    expect(decodeCode(encodeCode(''))).toBe('');
  });
});
```

**`tests/js/unit/error-renderer.test.js`**:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { renderError } from '../../lib/error-renderer.js';

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

  it('shows traceback details for multi-line errors', () => {
    renderError(el, 'Traceback:\n  File "<exec>"\nNameError: x');
    expect(el.querySelector('details')).not.toBeNull();
    expect(el.querySelector('.pl-error-header').textContent).toBe('NameError: x');
  });

  it('hides traceback for single-line errors', () => {
    renderError(el, 'NameError: x');
    expect(el.querySelector('details')).toBeNull();
  });
});
```

### 9.6 Vitest Configuration

**`vitest.config.js`** (project root):

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/js/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.js'],
      exclude: ['lib/panel-live.css'],
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage/js',
    },
  },
});
```

Key choices:
- **`environment: 'jsdom'`**: Provides `document`, `window`,
  `HTMLElement`, `customElements`, `navigator`, etc. Sufficient for
  testing DOM manipulation and custom elements without a real browser.
- **`include: ['tests/js/**/*.test.js']`**: Only picks up JS tests,
  avoids any conflict with Python test files.
- **`coverage.include: ['lib/**/*.js']`**: Measures coverage of source
  modules only.

### 9.7 pixi Integration

```toml
# Addition to pixi.toml [tasks]
test-js = { cmd = "npm test", depends-on = ["npm-install"] }
test-js-coverage = { cmd = "npm run test:coverage", depends-on = ["npm-install"] }
test-all = { cmd = "pixi run test && pixi run test-js" }
```

- `pixi run test-js` — runs Vitest (fast, ~1s for unit tests)
- `pixi run test-js-coverage` — runs Vitest with V8 coverage report
- `pixi run test-all` — runs both Python pytest and JS Vitest suites

For CI, `test-all` provides a single command that validates both
codebases. The JS tests add negligible time (~1-2s) to the pipeline.
