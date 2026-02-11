# Fullscreen

Enable a fullscreen toggle button for playground mode using the `fullscreen` boolean attribute.

## Enabling fullscreen

Add the `fullscreen` attribute to show a fullscreen toggle in the playground toolbar:

```html
<panel-live mode="playground" fullscreen>
import panel as pn
slider = pn.widgets.FloatSlider(name="Value", start=0, end=10, value=5)
pn.Row(slider, pn.bind(lambda v: f"Value: {v:.1f}", slider)).servable()
</panel-live>
```

When clicked, the `<panel-live>` element expands to fill the browser viewport. Click again (or press Escape) to exit fullscreen.

## HTML syntax

```html
<!-- Boolean attribute — presence enables fullscreen -->
<panel-live mode="playground" fullscreen>
  ...
</panel-live>

<!-- Explicitly disabled (same as omitting the attribute) -->
<panel-live mode="playground">
  ...
</panel-live>
```

## When to use

| Scenario | Recommended |
|----------|-------------|
| Playground pages | `fullscreen` enabled |
| Embedded demos in docs | Omit (not needed in small contexts) |
| Presentation / kiosk mode | `fullscreen` enabled |
