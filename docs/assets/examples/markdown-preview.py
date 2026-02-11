import panel as pn

pn.extension(sizing_mode="stretch_width")

SAMPLE = """# Hello Markdown

This is a **live preview** editor. Start typing to see changes instantly.

- Item one
- Item two
- Item three

> Blockquotes work too!

`inline code` and:

```python
print("Hello, world!")
```
"""

editor = pn.widgets.TextAreaInput(name="Markdown Source", value=SAMPLE, height=350)

pn.Row(
    pn.Card(editor, title="Editor", width=450),
    pn.Card(pn.bind(lambda md: pn.pane.Markdown(md if md else editor.value), editor.param.value_input), title="Preview"),
).servable()
