# CSS Custom Properties Reference

All visual aspects of `<panel-live>` are customizable via `--pl-*` CSS custom properties. Override these on the `panel-live` element selector or on specific instances.

## Property Reference

### Container

| Property | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--pl-border` | Border color | `#e0e0e0` | `#44475a` |
| `--pl-radius` | Border radius | `6px` | `6px` |
| `--pl-bg` | Background color | `#ffffff` | `#1e1e2e` |
| `--pl-font-mono` | Monospace font family | `'JetBrains Mono', monospace` | `'JetBrains Mono', monospace` |

### Header

| Property | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--pl-header-bg` | Header background | `#f5f5f5` | `#1e1e2e` |
| `--pl-header-color` | Header text color | `#333333` | `#cdd6f4` |

### Language Pill

| Property | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--pl-pill-bg` | Pill background | `#3b82f6` | `#3b82f6` |
| `--pl-pill-color` | Pill text color | `#ffffff` | `#ffffff` |

### Editor

| Property | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--pl-editor-bg` | Editor background | `#fafafa` | `#1e1e2e` |
| `--pl-editor-color` | Editor text color | `#1a1a2e` | `#cdd6f4` |
| `--pl-editor-font-size` | Editor font size | `14px` | `14px` |
| `--pl-editor-line-height` | Editor line height | `1.6` | `1.6` |

### Buttons

| Property | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--pl-btn-bg` | Button background | `#4caf50` | `#a6e3a1` |
| `--pl-btn-color` | Button text color | `#ffffff` | `#1e1e2e` |

### Output

| Property | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--pl-output-bg` | Output area background | `#ffffff` | `#282a36` |
| `--pl-output-min-height` | Output minimum height | `100px` | `100px` |

### Status

| Property | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--pl-status-color` | Status text color | `#555` | `#a0a0a0` |
| `--pl-status-spinner` | Spinner color | `#1976d2` | `#64b5f6` |

### Error

| Property | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--pl-error-color` | Error text color | `#b71c1c` | `#ef9a9a` |
| `--pl-error-bg` | Error background | `#ffebee` | `#3e1e1e` |

### Drag Handle

| Property | Description | Light Default | Dark Default |
|----------|-------------|---------------|--------------|
| `--pl-handle-bg` | Handle background | `#e0e0e0` | `#44475a` |
| `--pl-handle-hover-bg` | Handle hover color | `#3b82f6` | `#3b82f6` |

## Theme Presets

The `theme` attribute sets all variables to a preset. `theme="auto"` uses `@media (prefers-color-scheme)` to select between light and dark.

### Light Theme

Applied when `theme="light"` or when `theme="auto"` resolves to light:

```css
panel-live[theme="light"], panel-live[data-resolved-theme="light"] {
  --pl-border: #e0e0e0;       --pl-bg: #ffffff;
  --pl-header-bg: #f5f5f5;    --pl-header-color: #333333;
  --pl-editor-bg: #fafafa;    --pl-editor-color: #1a1a2e;
  --pl-btn-bg: #4caf50;       --pl-btn-color: #ffffff;
  --pl-output-bg: #ffffff;
  --pl-status-color: #555;     --pl-status-spinner: #1976d2;
  --pl-error-color: #b71c1c;   --pl-error-bg: #ffebee;
  --pl-handle-bg: #e0e0e0;     --pl-handle-hover-bg: #3b82f6;
}
```

### Dark Theme

Applied when `theme="dark"` or when `theme="auto"` resolves to dark:

```css
panel-live[theme="dark"], panel-live[data-resolved-theme="dark"] {
  --pl-border: #44475a;       --pl-bg: #1e1e2e;
  --pl-header-bg: #1e1e2e;    --pl-header-color: #cdd6f4;
  --pl-editor-bg: #1e1e2e;    --pl-editor-color: #cdd6f4;
  --pl-btn-bg: #a6e3a1;       --pl-btn-color: #1e1e2e;
  --pl-output-bg: #282a36;
  --pl-status-color: #a0a0a0;  --pl-status-spinner: #64b5f6;
  --pl-error-color: #ef9a9a;   --pl-error-bg: #3e1e1e;
  --pl-handle-bg: #44475a;     --pl-handle-hover-bg: #3b82f6;
}
```

## Overriding Variables

### Per-instance override

```html
<style>
  #my-editor {
    --pl-btn-bg: #ff5722;
    --pl-btn-color: #ffffff;
    --pl-radius: 12px;
  }
</style>
<panel-live id="my-editor" mode="editor">
import panel as pn
pn.panel("Custom styled").servable()
</panel-live>
```

### Global override

```css
panel-live {
  --pl-font-mono: 'Fira Code', monospace;
  --pl-radius: 0;
}
```

### Class-based theming

```css
panel-live.brand-primary {
  --pl-btn-bg: #1a73e8;
  --pl-pill-bg: #1a73e8;
  --pl-header-bg: #1a237e;
  --pl-header-color: #e8eaf6;
}
```
