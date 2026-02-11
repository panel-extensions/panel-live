# Examples Source

Load a set of playground examples from an external JSON file using the `examples-src` attribute.

## Defining examples in JSON

Create a JSON file with an array of example objects:

```json
[
  { "name": "Hello World", "code": "import panel as pn\npn.panel('Hello!').servable()" },
  { "name": "Slider", "src": "examples/slider.py" }
]
```

Each example object supports:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Display name in the dropdown |
| `code` | `string` | Inline Python code |
| `src` | `string` | URL to fetch code from (alternative to `code`) |

## Loading examples

Point `examples-src` to the JSON file:

```html
<panel-live mode="playground" examples-src="examples/gallery.json"></panel-live>
```

The examples appear in a dropdown menu in the playground toolbar. Selecting an example loads its code into the editor.

## Inline alternative

You can also define examples directly in HTML using `<panel-example>` child elements:

```html
<panel-live mode="playground">
  <panel-example name="Hello">
import panel as pn
pn.panel("Hello!").servable()
  </panel-example>
  <panel-example name="Slider" src="examples/slider.py"></panel-example>
</panel-live>
```

## When to use each

| Scenario | Recommended |
|----------|-------------|
| Many examples, shared across pages | `examples-src` JSON file |
| Few examples, page-specific | `<panel-example>` child elements |
| Dynamic example lists | `examples-src` (update JSON without changing HTML) |
