# Closed Issues

Resolved and rejected issues from the panel-live project.

---

## ~~P0 — Design Extensible User/Developer-Facing API~~

**Resolved.** The API uses a single `<panel-live>` custom element (Light DOM) with `mode="app|editor|playground"`. Full specification covers HTML attributes, child elements, JS API, CSS custom properties, and events.

---

## ~~P0 — Settle on Name~~

**Resolved.** The name is **panel-live**, mirroring the "shinylive" convention.

---

## ~~P0 — Determine Repository~~

**Resolved.** Separate `panel-live` repo under `panel-extensions` GitHub organization.

---

## ~~P0 — Does Not Work with panel-material-ui~~

**Resolved.** Confirmed working — `pmui.Button(label="Click Me")` renders successfully. The original issue was related to an older version.

---

## ~~P1 — Evaluate PyScript as Foundation~~

**Rejected.** PyScript adds dependency risk, has stability concerns, and provides no meaningful value for Panel's use case. The POC confirms everything works without it.

---

## ~~P1 — Folder and File Structure~~

**Resolved.** Repo structure finalized: `src/panel_live/` (Python), `lib/` (JS/CSS), `docs/`, `tests/`, `examples/`.

---

## ~~P1 — Separate CSS~~

**Resolved.** CSS extracted from JS into standalone `panel-live.css` (372 lines). CSS custom properties (`--pl-*`) with light/dark presets preserved.

---

## ~~P1 — Cannot Select Code with Mouse~~

**Resolved.** CodeMirror 5 integration works correctly. The original issue was caused by overlapping elements in the old architecture.

---

## ~~P1 — Interactive API Explorer Page~~

**Resolved.** Full interactive explorer at `docs/api-explorer.html` with mode/theme/layout controls, 14 example snippets, CSS variable controls, and live HTML generation.

---

## ~~P1 — Loading Progress (All Modes)~~

**Resolved.** All 3 modes use identical loading UI with status bar, spinner, and stage progression text.

---

## ~~P2 — Multi-file Support~~

**Resolved.** `<panel-file>` custom element supports multi-file apps with `name`, `entrypoint`, and `src` attributes. Files written to Pyodide's virtual filesystem.

---

## ~~P2 — Requirements / Package Specification~~

**Resolved.** `<panel-requirements>` element allows explicit pip package specification. Auto-detection via `find_requirements()` as fallback.

---

## ~~P2 — MkDocs Extension~~

**Resolved.** `src/panel_live/fences.py` implements custom fence for `pymdownx.superfences`. Supports all attributes via `` ```{.panel ...} `` syntax.

---

## ~~P2 — Align Styles Across Modes~~

**Resolved.** Unified `--pl-*` CSS variable system shared by all 3 modes. Styles in separate `panel-live.css`.

---

## ~~P2 — Customizable Styling / Branding~~

**Resolved.** Full `--pl-*` CSS variable system with light/dark presets. `theme="auto"` detects `prefers-color-scheme`.

---

## ~~P2 — Playground Layout Options~~

**Resolved.** `layout` attribute with `"horizontal"` and `"vertical"` values.

---

## ~~P2 — Pixi Commands~~

**Resolved.** `pixi.toml` defines tasks across multiple environments: test, lint, docs, build, serve.

---

## ~~P2 — GitHub Actions CI/CD~~

**Resolved.** CI with pytest, Playwright UI tests, and pre-commit linting on PRs and pushes.

---

## ~~P3 — Dark Theme Support~~

**Resolved.** `theme="auto"|"light"|"dark"` with `prefers-color-scheme` detection, Dracula for dark, CodeMirror default for light.

---

## ~~P1 — Duplicate Execution Logic~~

**Resolved.** Single `runPanelCode()` function with 3-branch execution strategy. No iframe mode, no duplication.

---

## ~~P1 — Copy Code Button~~

**Resolved.** Copy button with `navigator.clipboard.writeText()` and "Copied!" toast feedback in all editor/playground modes. "Copy error" button on error panels.

---

## ~~P2 — Docs Theme Toggle Does Not Update Instances~~

**Resolved.** `MutationObserver` watches `data-md-color-scheme` on `document.body` and updates CodeMirror theme dynamically. `MediaQuery` listener handles system preference changes.

---

## ~~P2 — Landing Page Should Showcase Generic Python Support~~

**Resolved.** Landing page includes a matplotlib example (no Panel imports) immediately after the default slider demo, under a "Works with any Python" section.

---

## ~~P2 — Revise README for Broader Audience~~

**Resolved.** README leads with "Write, edit, and run Python interactively in the browser" and "Turn any web page into an interactive Python playground". No Panel-centric framing.

---

## ~~P1 — Fix events/ Page Navigation~~

**Resolved.** Events page moved from under "Styling" to its own "Events" section in `zensical.toml` navigation. The page now appears correctly in the sidebar.

---

## ~~P2 — Rename "Competitors" to "Alternatives"~~

**Resolved.** All references to "competitors" in `docs/explanation/design.md` replaced with "alternatives" — section heading, comparison table intro, and differentiators list.

---

## ~~P2 — Enable "org" Mode in MkDocs~~

**Resolved.** `mode="org"` in the fence syntax delegates to `pymdownx.superfences.fence_code_format()` to render a standard syntax-highlighted code block. No `<panel-live>` element is inserted. Documented in how-to/mode.md and reference/html-api.md. Tests in `tests/test_fences.py`.
