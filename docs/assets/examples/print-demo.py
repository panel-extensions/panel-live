import panel as pn

pn.extension(sizing_mode="stretch_width")

# print() output is now visible above the app output
print("Loading data...")
print("Processing 100 records...")

items = ["Panel", "HoloViews", "hvPlot", "Datashader"]
for item in items:
    print(f"  - {item} loaded")

pn.panel(f"## Loaded {len(items)} HoloViz packages").servable()
