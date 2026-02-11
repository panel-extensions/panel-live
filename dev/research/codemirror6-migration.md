# CodeMirror 6 Migration for panel-live

Detailed mapping of current CodeMirror 5 usage to CodeMirror 6 equivalents,
migration strategy, benefits, and effort estimate.

---

## 1. Current CodeMirror 5 Usage

All CM5 usage is in `lib/panel-live.js`. There are two functions and
several usage sites throughout the `PanelLive` class.

### 1.1 Loading (`loadCodeMirror()`, lines 114-130)

```js
const CM_VERSION = '5.65.18';
const CM_CDN = `https://cdnjs.cloudflare.com/ajax/libs/codemirror/${CM_VERSION}`;

function loadCodeMirror() {
  if (_cmLoadPromise) return _cmLoadPromise;
  _cmLoadPromise = (async () => {
    if (_cmLoaded) return;
    loadCSS(CM_CDN + '/codemirror.min.css');
    loadCSS(CM_CDN + '/theme/dracula.min.css');
    await loadScript(CM_CDN + '/codemirror.min.js');
    await loadScript(CM_CDN + '/mode/python/python.min.js');
    await loadScript(CM_CDN + '/addon/edit/matchbrackets.min.js');
    await loadScript(CM_CDN + '/addon/edit/closebrackets.min.js');
    await loadScript(CM_CDN + '/addon/selection/active-line.min.js');
    await loadScript(CM_CDN + '/addon/comment/comment.min.js');
    _cmLoaded = true;
  })();
  return _cmLoadPromise;
}
```

This loads 7 resources from `cdnjs.cloudflare.com`:
1. Core CSS (`codemirror.min.css`)
2. Dracula theme CSS (`theme/dracula.min.css`)
3. Core JS (`codemirror.min.js`)
4. Python mode (`mode/python/python.min.js`)
5. Match brackets addon (`addon/edit/matchbrackets.min.js`)
6. Close brackets addon (`addon/edit/closebrackets.min.js`)
7. Active line addon (`addon/selection/active-line.min.js`)
8. Comment addon (`addon/comment/comment.min.js`)

### 1.2 Editor Creation (`createCMEditor()`, lines 132-162)

```js
function createCMEditor(textarea, resolvedTheme, onRun) {
  const cmTheme = resolvedTheme === 'light' ? 'default' : 'dracula';
  const cm = CodeMirror.fromTextArea(textarea, {
    mode: 'python',
    theme: cmTheme,
    lineNumbers: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    styleActiveLine: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: false,
    lineWrapping: false,
    extraKeys: {
      'Ctrl-Enter': () => { if (onRun) onRun(); },
      'Cmd-Enter': () => { if (onRun) onRun(); },
      'Ctrl-/': 'toggleComment',
      'Cmd-/': 'toggleComment',
      'Tab': (cm) => {
        if (cm.somethingSelected()) {
          cm.indentSelection('add');
        } else {
          cm.replaceSelection('    ', 'end');
        }
      },
      'Shift-Tab': (cm) => { cm.indentSelection('subtract'); },
    }
  });
  setTimeout(() => cm.refresh(), 50);
  return cm;
}
```

Features used:
- Python syntax highlighting (`mode: 'python'`)
- Theme switching (`theme: 'default'` or `'dracula'`)
- Line numbers (`lineNumbers: true`)
- Bracket matching (`matchBrackets: true`)
- Auto-close brackets (`autoCloseBrackets: true`)
- Active line highlight (`styleActiveLine: true`)
- Indent settings (`indentUnit: 4`, `tabSize: 4`, `indentWithTabs: false`)
- Key bindings (Ctrl/Cmd-Enter for run, Ctrl/Cmd-/ for comment toggle,
  Tab for indent/insert spaces, Shift-Tab for dedent)

### 1.3 Theme Switching (`_setupTheme()`, lines 592-635)

```js
if (this._cm) {
  this._cm.setOption('theme', this._resolvedTheme === 'dark' ? 'dracula' : 'default');
}
```

Called when the system theme changes (media query) or when the MkDocs Material
theme toggle is used. Dynamically switches between light and dark themes.

### 1.4 Value Get/Set (multiple locations)

```js
// Get current editor content
this._cm.getValue()

// Set editor content
this._cm.setValue(code)
```

Used by:
- `_runFromEditor()` (line 1298) to get code before execution
- Copy button handler (line 879) to get code for clipboard
- Reset button handler (line 1110) to restore original code
- Examples dropdown handler (line 1134) to load example code
- Share button handler (line 1118) to encode code in URL hash

### 1.5 Refresh (multiple locations)

```js
this._cm.refresh()
```

Called after:
- Initial creation (`setTimeout(() => cm.refresh(), 50)`)
- Code toggle expand (line 852)
- Fullscreen toggle (lines 1153, 1158)

Used to recalculate editor dimensions when the container size changes.

### 1.6 CSS Overrides (`panel-live.css`, lines 344-365)

```css
.pl-container .CodeMirror {
  height: auto;
  min-height: 180px;
  max-height: 500px;
  font-family: var(--pl-font-mono, ...);
  font-size: var(--pl-editor-font-size, 14px);
  line-height: var(--pl-editor-line-height, 1.6);
  border: none;
}
.pl-playground > .pl-editor-pane .CodeMirror {
  height: 100%;
  max-height: none;
  min-height: 300px;
}
.pl-editor-stacked.code-last > .CodeMirror {
  /* code-last layout adjustment */
}
```

---

## 2. CodeMirror 6 Equivalents

### 2.1 Package Mapping

| CM5 Resource | CM6 Package | Purpose |
|-------------|-------------|---------|
| `codemirror.min.js` | `@codemirror/state`, `@codemirror/view` | Core editor |
| `mode/python/python.min.js` | `@codemirror/lang-python` | Python syntax highlighting |
| `addon/edit/matchbrackets.min.js` | `@codemirror/language` (`bracketMatching()`) | Bracket matching |
| `addon/edit/closebrackets.min.js` | `@codemirror/autocomplete` (`closeBrackets()`) | Auto-close brackets |
| `addon/selection/active-line.min.js` | `@codemirror/view` (`highlightActiveLine()`) | Active line highlight |
| `addon/comment/comment.min.js` | `@codemirror/commands` (`toggleComment`) | Comment toggle |
| `codemirror.min.css` | (included in `@codemirror/view`) | Base editor styles |
| `theme/dracula.min.css` | `@codemirror/theme-one-dark` or custom | Dark theme |

### 2.2 Loading (replaces `loadCodeMirror()`)

CM6 is ESM-only. With a build system (see `build-system-analysis.md`),
all CM6 code is imported at build time and bundled into `panel-live.js`.
There is no runtime CDN loading.

```js
// Top of panel-live.js (ESM imports, resolved at build time)
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine,
         drawSelection, highlightSpecialChars } from '@codemirror/view';
import { defaultHighlightStyle, syntaxHighlighting, indentOnInput,
         bracketMatching, foldGutter, indentUnit } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, indentWithTab, history, historyKeymap,
         toggleComment } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
```

The `loadCodeMirror()` function, `_cmLoaded`, `_cmLoadPromise`, `CM_VERSION`,
and `CM_CDN` constants are all eliminated. The editor code is available
immediately -- no async loading, no race conditions, no CDN failures.

### 2.3 Editor Creation (replaces `createCMEditor()`)

```js
function createCM6Editor(parentEl, initialCode, resolvedTheme, onRun) {
  const isDark = resolvedTheme === 'dark';

  const runKeyBinding = keymap.of([
    {
      key: 'Ctrl-Enter',
      run: () => { if (onRun) onRun(); return true; },
    },
    {
      key: 'Cmd-Enter',
      run: () => { if (onRun) onRun(); return true; },
    },
    {
      key: 'Ctrl-/',
      run: toggleComment,
    },
    {
      key: 'Cmd-/',
      run: toggleComment,
    },
  ]);

  const tabBinding = keymap.of([
    {
      key: 'Tab',
      run: (view) => {
        if (view.state.selection.ranges.some(r => !r.empty)) {
          // Selection exists: indent
          return indentMore(view);
        }
        // No selection: insert 4 spaces
        view.dispatch(view.state.replaceSelection('    '));
        return true;
      },
    },
    {
      key: 'Shift-Tab',
      run: indentLess,
    },
  ]);

  const baseExtensions = [
    lineNumbers(),
    highlightActiveLine(),
    drawSelection(),
    highlightSpecialChars(),
    history(),
    bracketMatching(),
    closeBrackets(),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    indentUnit.of('    '),
    EditorState.tabSize.of(4),
    python(),
    runKeyBinding,
    tabBinding,
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap]),
  ];

  if (isDark) {
    baseExtensions.push(oneDark);
  }

  const state = EditorState.create({
    doc: initialCode,
    extensions: baseExtensions,
  });

  const view = new EditorView({
    state,
    parent: parentEl,
  });

  return view;
}
```

Key differences from CM5:
- CM6 uses an `extensions` array instead of a flat options object
- CM6 attaches to a parent element instead of replacing a textarea
- Key bindings use `keymap.of()` instead of `extraKeys`
- There is no `fromTextArea()` -- the editor creates its own DOM
- No `setTimeout(() => cm.refresh(), 50)` needed -- CM6 handles this via
  `ResizeObserver` internally

### 2.4 Theme Switching (replaces `setOption('theme', ...)`)

CM6 does not have a `setOption()` API. Instead, themes are extensions that
can be dynamically reconfigured using compartments:

```js
import { Compartment } from '@codemirror/state';

const themeCompartment = new Compartment();

// During creation, wrap the theme in the compartment:
const extensions = [
  // ... other extensions ...
  themeCompartment.of(isDark ? oneDark : []),
];

// To switch themes later:
function setTheme(view, isDark) {
  view.dispatch({
    effects: themeCompartment.reconfigure(isDark ? oneDark : []),
  });
}
```

An empty array `[]` for the light theme means "use the default light
styling" (CM6's default styles are light-themed). This replaces the
CM5 pattern of `setOption('theme', 'default')` vs `setOption('theme', 'dracula')`.

### 2.5 Value Get/Set (replaces `getValue()` / `setValue()`)

```js
// Get current content (replaces cm.getValue())
const code = view.state.doc.toString();

// Set content (replaces cm.setValue(code))
view.dispatch({
  changes: {
    from: 0,
    to: view.state.doc.length,
    insert: code,
  },
});
```

The `dispatch` API is more verbose but more powerful -- it supports
atomic multi-change transactions, annotations, and undo integration.

### 2.6 Refresh (replaces `cm.refresh()`)

CM6 uses `ResizeObserver` internally and generally does not need manual
refresh calls. However, if the editor's container is hidden and then
shown (e.g., the collapsed code toggle), a manual geometry update
may be needed:

```js
// Force geometry recalculation (replaces cm.refresh())
view.requestMeasure();
```

In most cases this is not needed because CM6 detects container
size changes automatically. The `setTimeout(() => cm.refresh(), 50)`
pattern used throughout panel-live's CM5 code can likely be removed
entirely. If needed for edge cases (e.g., after fullscreen toggle),
`requestMeasure()` is the equivalent.

### 2.7 CSS Overrides

CM6 generates different class names than CM5. The CSS selectors need updating:

| CM5 Selector | CM6 Selector | Purpose |
|-------------|-------------|---------|
| `.CodeMirror` | `.cm-editor` | Main editor container |
| `.CodeMirror-scroll` | `.cm-scroller` | Scroll container |
| `.CodeMirror-gutters` | `.cm-gutters` | Line number gutter |
| `.CodeMirror-lines` | `.cm-content` | Content area |
| `.CodeMirror-cursor` | `.cm-cursor` | Cursor |
| `.CodeMirror-activeline` | `.cm-activeLine` | Active line |
| `.CodeMirror-matchingbracket` | `.cm-matchingBracket` | Matching bracket |

Updated CSS:

```css
/* ---- CodeMirror 6 overrides ---- */
.pl-container .cm-editor {
  height: auto;
  min-height: 180px;
  max-height: 500px;
  font-family: var(--pl-font-mono, "JetBrains Mono", "Fira Code",
    "Cascadia Code", "Consolas", monospace);
  font-size: var(--pl-editor-font-size, 14px);
  line-height: var(--pl-editor-line-height, 1.6);
  border: none;
}
.pl-playground > .pl-editor-pane .cm-editor {
  height: 100%;
  max-height: none;
  min-height: 300px;
}
panel-live[fullscreen] .pl-playground > .pl-editor-pane .cm-editor {
  min-height: 0;
}
.pl-editor-stacked.code-last > .cm-editor {
  /* code-last layout adjustment */
}
```

Additionally, the `.pl-editor-area.pl-cm-active { display: none; }` rule
can be simplified. CM6 does not use `fromTextArea()` and does not need
to hide a textarea. The textarea is no longer needed at all when CM6
is active -- the editor creates its own DOM elements.

---

## 3. Theme Considerations

### 3.1 Dark Theme

CM5 used the Dracula theme. CM6 does not have an official Dracula theme,
but several options exist:

| Option | Package | Notes |
|--------|---------|-------|
| One Dark | `@codemirror/theme-one-dark` | Official CM6 package. Atom One Dark style. Closest official dark theme. |
| Dracula (community) | `thememirror` or `@uiw/codemirror-theme-dracula` | Community packages that provide Dracula for CM6. Adds a dependency. |
| Custom theme | `EditorView.theme({...})` | Define custom colors to match the current Dracula look exactly. |

**Recommendation**: Use `@codemirror/theme-one-dark` for the initial migration.
It is an official, maintained package with no extra dependencies. The visual
difference from Dracula is minor (both are dark themes with similar color
palettes). If users specifically need Dracula, a custom theme can be created
later:

```js
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

const draculaTheme = EditorView.theme({
  '&': { backgroundColor: '#282a36', color: '#f8f8f2' },
  '.cm-content': { caretColor: '#f8f8f0' },
  '.cm-cursor': { borderLeftColor: '#f8f8f0' },
  '.cm-activeLine': { backgroundColor: '#44475a' },
  '.cm-gutters': { backgroundColor: '#282a36', color: '#6272a4' },
  '.cm-activeLineGutter': { backgroundColor: '#44475a' },
}, { dark: true });

const draculaHighlight = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.keyword, color: '#ff79c6' },
  { tag: tags.string, color: '#f1fa8c' },
  { tag: tags.comment, color: '#6272a4' },
  { tag: tags.number, color: '#bd93f9' },
  { tag: tags.function(tags.variableName), color: '#50fa7b' },
  { tag: tags.className, color: '#8be9fd' },
  { tag: tags.operator, color: '#ff79c6' },
  { tag: tags.bool, color: '#bd93f9' },
  // ... more tags as needed
]));
```

### 3.2 Light Theme

CM6's default styling is light-themed. No explicit light theme extension
is needed. The default colors work well and can be customized via
`EditorView.theme()` if needed.

---

## 4. Complete Migration Mapping

### 4.1 Module-Level Changes

| Current (CM5) | After Migration (CM6) | Action |
|---------------|----------------------|--------|
| `let _cmLoaded = false` | (removed) | Delete |
| `let _cmLoadPromise = null` | (removed) | Delete |
| `const CM_VERSION = '5.65.18'` | (removed) | Delete |
| `const CM_CDN = ...` | (removed) | Delete |
| `function loadCodeMirror()` | (removed) | Delete; CM6 is bundled |
| `function loadCSS(CM_CDN + ...)` | (removed) | Delete; CM6 CSS is bundled |

### 4.2 Function Changes

| Current (CM5) | After Migration (CM6) | Notes |
|---------------|----------------------|-------|
| `createCMEditor(textarea, theme, onRun)` | `createCM6Editor(parentEl, code, theme, onRun)` | New signature; returns EditorView |
| `CodeMirror.fromTextArea(textarea, opts)` | `new EditorView({state, parent})` | No textarea needed |
| `cm.setOption('theme', ...)` | `view.dispatch({effects: themeCompartment.reconfigure(...)})` | Compartment-based |
| `cm.getValue()` | `view.state.doc.toString()` | |
| `cm.setValue(code)` | `view.dispatch({changes: {from: 0, to: ..., insert: code}})` | |
| `cm.refresh()` | `view.requestMeasure()` (or remove entirely) | Usually not needed |
| `cm.somethingSelected()` | `view.state.selection.ranges.some(r => !r.empty)` | |

### 4.3 Rendering Changes

CM5 uses `fromTextArea()`, which requires a `<textarea>` element and hides it.
CM6 creates its own DOM elements inside a parent container. This changes the
rendering approach:

**Current** (CM5):
```html
<textarea class="pl-editor-area">${code}</textarea>
```
```js
loadCodeMirror().then(() => {
  this._cm = createCMEditor(textarea, rt, onRun);
  textarea.classList.add('pl-cm-active');
});
```

**After migration** (CM6):
```html
<div class="pl-editor-area"></div>
```
```js
this._view = createCM6Editor(editorContainer, this._code, rt, onRun);
```

The textarea is eliminated. The `pl-cm-active` class and its CSS rule
(`.pl-editor-area.pl-cm-active { display: none; }`) are no longer needed.

However, a plain textarea should still be rendered as a fallback for
cases where CM6 might fail to load (should not happen with bundling,
but defensive coding). In practice, since CM6 is bundled and synchronous,
the fallback textarea can be a minimal hidden element used only by
`getCode()` / `setCode()` when `this._view` is null.

### 4.4 PanelLive Class Property Changes

| Current | After Migration |
|---------|----------------|
| `this._cm` (CodeMirror 5 instance) | `this._view` (EditorView instance) |
| `this._textarea` (textarea element) | `this._editorContainer` (div element) |

### 4.5 Usage Site Changes

Every location that references `this._cm` needs updating. Here is the
complete list:

**`_setupTheme()`** (2 occurrences, lines 611-612 and 624-625):
```js
// Before:
if (this._cm) this._cm.setOption('theme', isDark ? 'dracula' : 'default');

// After:
if (this._view) setTheme(this._view, isDark);
```

**`_renderEditorMode()`** (line 863):
```js
// Before:
loadCodeMirror().then(() => {
  this._cm = createCMEditor(textarea, rt, () => {
    this._runFromEditor(textarea, outputEl, statusEl);
  });
  textarea.classList.add('pl-cm-active');
});

// After:
const editorContainer = container.querySelector('.pl-editor-area');
this._view = createCM6Editor(editorContainer, this._code, rt, () => {
  this._runFromEditor(outputEl, statusEl);
});
```

**Code toggle expand** (line 852):
```js
// Before:
if (this._cm) setTimeout(() => this._cm.refresh(), 50);

// After:
if (this._view) this._view.requestMeasure();
```

**Copy button** (line 879):
```js
// Before:
const code = this._cm ? this._cm.getValue() : textarea.value;

// After:
const code = this._view ? this._view.state.doc.toString() : '';
```

**Run from editor** (line 1298):
```js
// Before:
const code = this._cm ? this._cm.getValue() : textarea.value;

// After:
const code = this._view ? this._view.state.doc.toString() : '';
```

**Reset button** (line 1110):
```js
// Before:
if (this._cm) this._cm.setValue(this._code);

// After:
if (this._view) {
  this._view.dispatch({
    changes: { from: 0, to: this._view.state.doc.length, insert: this._code },
  });
}
```

**Examples dropdown** (line 1134):
```js
// Before:
if (this._cm) this._cm.setValue(example.code);

// After:
if (this._view) {
  this._view.dispatch({
    changes: { from: 0, to: this._view.state.doc.length, insert: example.code },
  });
}
```

**Fullscreen toggle** (line 1153):
```js
// Before:
if (this._cm) setTimeout(() => this._cm.refresh(), 50);

// After:
if (this._view) this._view.requestMeasure();
```

**`getCode()` public method** (line 1332):
```js
// Before:
if (this._cm) return this._cm.getValue();

// After:
if (this._view) return this._view.state.doc.toString();
```

**`setCode()` public method** (line 1338):
```js
// Before:
if (this._cm) this._cm.setValue(code);

// After:
if (this._view) {
  this._view.dispatch({
    changes: { from: 0, to: this._view.state.doc.length, insert: code },
  });
}
```

---

## 5. Benefits of Migration

### 5.1 Eliminates CDN Dependency

The current CM5 loading from `cdnjs.cloudflare.com` is blocked by:
- Firefox Enhanced Tracking Protection (strict mode)
- Brave browser (default settings)
- Corporate network proxies that block CDN domains
- Content Security Policy (CSP) restrictions on third-party scripts

Bundling CM6 eliminates all of these issues. The editor code loads from
the same origin as `panel-live.js`.

### 5.2 Better Accessibility

CM6 was designed with accessibility as a core requirement:
- Full ARIA support (proper roles, labels, live regions)
- Screen reader compatibility (tested with NVDA, VoiceOver, JAWS)
- Keyboard navigation improvements
- High contrast mode support
- Focus management for complex UI (autocomplete, tooltips)

CM5 has significant accessibility gaps that were never fully addressed.

### 5.3 Better Mobile Support

CM6 supports touch events and mobile keyboards natively:
- Touch-based selection and cursor placement
- Virtual keyboard integration
- Pinch-to-zoom awareness
- Proper viewport handling on iOS Safari

CM5's mobile support is limited and has known issues with virtual keyboards.

### 5.4 Smaller Bundle with Tree-Shaking

CM6's modular architecture means only the features actually used are
included in the bundle. Estimated sizes:

| Setup | Size (minified) | Size (gzipped) |
|-------|----------------|----------------|
| CM5 (current CDN loads) | ~167KB | ~55KB |
| CM6 (bundled, tree-shaken) | ~120KB | ~40KB |

The reduction comes from CM6's modular design: we only import the specific
extensions we need, whereas CM5's monolithic `codemirror.min.js` includes
many features we don't use.

### 5.5 Active Development

CM5 is in maintenance-only mode (security fixes only, no new features).
CM6 is actively developed with regular releases, new features, and
performance improvements. Staying on CM5 means accumulating technical
debt as the editor ecosystem moves forward.

### 5.6 Future Capabilities

CM6 enables features that are difficult or impossible with CM5:
- Language Server Protocol (LSP) integration for Python autocomplete
- Collaborative editing (CM6 was designed with this in mind)
- Custom lint/diagnostics integration
- Efficient large-document handling
- Custom syntax highlighting themes per-instance

---

## 6. Migration Strategy

### 6.1 Prerequisites

The build system must be in place before CM6 migration can begin.
See `build-system-analysis.md` for the recommended esbuild setup.
CM6 is ESM-only and requires bundling.

### 6.2 Can It Be Done Incrementally?

**No.** CM5 and CM6 are fundamentally different libraries with incompatible
APIs. There is no adapter layer or compatibility mode. The migration must
be done as a single atomic change:

1. Remove all CM5 CDN loading code
2. Add CM6 ESM imports
3. Replace `createCMEditor()` with `createCM6Editor()`
4. Update all `this._cm` usage sites to use the CM6 API
5. Update CSS selectors from `.CodeMirror` to `.cm-editor`

However, the migration can be staged within a single branch:

- **Commit 1**: Add build system (esbuild) with no behavior change
- **Commit 2**: Add CM6 packages, implement `createCM6Editor()`
- **Commit 3**: Replace CM5 usage in `PanelLive` class
- **Commit 4**: Update CSS
- **Commit 5**: Remove CM5 loading code, test everything

### 6.3 Testing Strategy

The existing Playwright UI tests (`tests/ui/`) exercise the editor
through the `<panel-live>` element's public API. Since the public API
(`getCode()`, `setCode()`, `run()`) does not change, these tests
should pass without modification after the migration.

Additional manual testing:
- Verify Python syntax highlighting renders correctly
- Verify bracket matching (type `(` and see `)` added)
- Verify Ctrl+Enter triggers execution
- Verify theme switching (light/dark)
- Verify the editor in all three modes: app, editor, playground
- Verify code toggle (collapsed/expanded) works
- Verify horizontal layout with drag handle
- Verify fullscreen mode

### 6.4 Build Output Must Flow to Docs

The build system must ensure that the latest built JS/CSS is always copied to `docs/assets/`. This applies to both:

1. **Production builds** (`pixi run sync-assets` currently copies from `lib/` → `docs/assets/`; after build system, it copies from `dist/` → `docs/assets/`)
2. **Development with hot reload**: Running `esbuild --watch` alongside `pixi run -e docs serve` should automatically rebuild and copy assets so that docs changes are visible without manual steps. Consider either:
   - An esbuild plugin that copies output to `docs/assets/` on each rebuild
   - A `pixi run dev` task that runs both the esbuild watcher and docs server concurrently

---

## 7. Effort Estimate

| Task | Effort | Dependencies |
|------|--------|-------------|
| Build system setup (esbuild) | Small (1-2 days) | None |
| CM6 package selection and installation | Small (1 day) | Build system |
| Implement `createCM6Editor()` | Small (1 day) | CM6 packages |
| Theme compartment setup | Small (half day) | `createCM6Editor()` |
| Replace all `this._cm` usage sites | Medium (1-2 days) | `createCM6Editor()` |
| Update CSS selectors | Small (half day) | `createCM6Editor()` |
| Remove CM5 loading code | Small (half day) | All above |
| Testing (automated + manual) | Medium (1-2 days) | All above |
| **Total** | **~5-8 days** | |

The build system setup (from `build-system-analysis.md`) is the prerequisite.
Once esbuild is in place, the CM6 migration itself is approximately one week
of focused work.

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CM6 bundle size larger than expected | Low | Low | Tree-shaking + minification keeps it reasonable |
| CSS conflicts with Panel/Bokeh output | Low | Medium | CM6 uses `.cm-` prefix, avoiding most conflicts |
| Theme visual difference from Dracula | Medium | Low | One Dark is close enough; custom theme can be added later |
| Edge case in textarea-to-div migration | Medium | Low | Comprehensive testing of all render modes |
| Performance regression (editor init speed) | Low | Low | CM6 is generally faster than CM5 to initialize |

---

## 8. Summary

The CodeMirror 6 migration is a well-scoped, low-risk improvement that
eliminates the CDN dependency (fixing the tracking prevention blocker),
improves accessibility and mobile support, and positions panel-live on
an actively maintained editor platform.

The migration requires a build system (esbuild recommended) as a
prerequisite, and must be done atomically (no incremental CM5/CM6 hybrid).
Total effort is approximately one week after the build system is in place.

Key files that change:
- `lib/panel-live.js` -- CM5 code replaced with CM6 imports and API calls
- `lib/panel-live.css` -- `.CodeMirror` selectors changed to `.cm-editor`
- `package.json` (new) -- CM6 npm dependencies
- `build.mjs` (new) -- esbuild configuration
