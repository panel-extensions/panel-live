# CSS Custom Properties

Override `--pl-*` CSS custom properties to customize the look and feel of `<panel-live>` elements.

## Overriding on a single instance

Target a specific element by ID or class:

```html
<style>
  #branded-editor {
    --pl-btn-bg: #ff5722;
    --pl-btn-color: #ffffff;
    --pl-pill-bg: #ff5722;
    --pl-radius: 12px;
  }
</style>
<panel-live id="branded-editor" mode="editor">
import panel as pn
pn.panel("Custom branded editor").servable()
</panel-live>
```

## Overriding globally

Apply overrides to all `<panel-live>` elements on the page:

```css
panel-live {
  --pl-font-mono: 'Fira Code', monospace;
  --pl-radius: 0;
  --pl-border: #cccccc;
}
```

## Class-based theming

Create reusable theme classes:

```css
panel-live.brand-blue {
  --pl-btn-bg: #1a73e8;
  --pl-pill-bg: #1a73e8;
  --pl-header-bg: #1a237e;
  --pl-header-color: #e8eaf6;
}

panel-live.brand-green {
  --pl-btn-bg: #2e7d32;
  --pl-pill-bg: #2e7d32;
  --pl-header-bg: #1b5e20;
  --pl-header-color: #e8f5e9;
}
```

```html
<panel-live class="brand-blue" mode="editor">...</panel-live>
<panel-live class="brand-green" mode="editor">...</panel-live>
```

## Key properties

The most commonly overridden properties:

| Property | What it controls |
|----------|-----------------|
| `--pl-btn-bg` / `--pl-btn-color` | Run button appearance |
| `--pl-pill-bg` / `--pl-pill-color` | Language pill in header |
| `--pl-header-bg` / `--pl-header-color` | Editor header bar |
| `--pl-editor-bg` / `--pl-editor-color` | Code editor background/text |
| `--pl-radius` | Corner rounding |
| `--pl-border` | Border color |
| `--pl-font-mono` | Code font family |

See the [CSS Custom Properties Reference](../reference/css-custom-properties.md) for the complete list of all `--pl-*` variables with light/dark defaults.
