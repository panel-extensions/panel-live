# Theming

Control the color scheme of `panel-live` using the `theme` attribute.

## Auto theme (default)

Follows the user's operating system preference via `prefers-color-scheme`. This is the default when no `theme` is specified.

```{.panel mode="editor" theme="auto" auto-run="true"}
import panel as pn
pn.panel("**Auto theme** — follows your OS light/dark preference.").servable()
```

## Light theme

Forces a light color scheme regardless of system preference.

```{.panel mode="editor" theme="light" auto-run="true"}
import panel as pn
pn.panel("**Light theme** — always light.").servable()
```

## Dark theme

Forces a dark color scheme regardless of system preference.

```{.panel mode="editor" theme="dark" auto-run="true"}
import panel as pn
pn.panel("**Dark theme** — always dark.").servable()
```

## Fence syntax

````markdown
```{.panel theme="auto"}
# follows OS preference (default)
```
````

````markdown
```{.panel theme="light"}
# always light
```
````

````markdown
```{.panel theme="dark"}
# always dark
```
````

## When to use each

| Scenario | Recommended |
|----------|-------------|
| General documentation | `auto` (respect user preference) |
| Light-only brand requirement | `light` |
| Terminal-style / hacker aesthetic | `dark` |
| Screenshots for docs/blog | `light` or `dark` (deterministic) |
